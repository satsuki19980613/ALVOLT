import os
import oracledb
import google.generativeai as genai
from dotenv import load_dotenv
import array
import warnings

# Geminiの「将来廃止されます」という警告を一時的に非表示にする
warnings.filterwarnings("ignore", category=FutureWarning)

# 環境設定読み込み
load_dotenv()

# Gemini設定
# ※警告に出ていますが、現在はまだ旧ライブラリでも動作するためこのまま進めます
try:
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
    EMBEDDING_MODEL = "models/text-embedding-004"
except ImportError:
    print("❌ google-generativeai ライブラリの読み込みに失敗しました。")

# DB接続準備
# 【修正点】init_oracle_client は削除しました（Thinモードを使用するため不要）

# 対象ファイル拡張子
TARGET_EXTS = {'.js', '.json', '.html', '.css', '.md', '.txt'}
IGNORE_DIRS = {'node_modules', '.git', 'dist', 'wallet', 'assets', '.next', '__pycache__'}

def get_embedding(text):
    """Gemini APIでベクトル化"""
    if not text or len(text) < 10: return None
    try:
        res = genai.embed_content(model=EMBEDDING_MODEL, content=text)
        return res['embedding']
    except Exception as e:
        # 時々APIが過負荷でエラーになることがあるため、ログだけ出して続行
        print(f" Embedding Error: {e}")
        return None

def main():
    print("🚀 Connecting to Oracle Database (Thin Mode)...")
    
    try:
        # 【修正点】Thinモードでの接続設定
        # config_dir で tnsnames.ora の場所を指定します
        conn = oracledb.connect(
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            dsn=os.getenv("DB_DSN"),
            config_dir=os.getenv("WALLET_DIR"), 
            wallet_location=os.getenv("WALLET_DIR"),
            wallet_password=os.getenv("DB_PASSWORD")
        )
        cursor = conn.cursor()
        print("✅ Oracle DB Connected!")
    except oracledb.Error as e:
        print(f"❌ DB Connection Failed: {e}")
        print("ヒント: .envの WALLET_DIR が正しいフォルダを指しているか確認してください。")
        return

    # ルートディレクトリ（スクリプトの一つ上の階層を想定）
    # ※スクリプトを memory_bank_scripts フォルダ内で実行している場合、
    # プロジェクトルートはその一つ上 (../) になります。
    # 現在のフォルダ構造に合わせて調整します。
    current_dir = os.getcwd()
    
    # もし memory_bank_scripts フォルダの中にいるなら、一つ上がプロジェクトルート
    if "memory_bank_scripts" in current_dir:
        project_root = os.path.dirname(current_dir)
    else:
        project_root = current_dir

    print(f"📂 Scanning Project Root: {project_root}")

    count = 0
    for dirpath, dirnames, filenames in os.walk(project_root):
        # 除外ディレクトリをスキップ
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]

        for fname in filenames:
            if os.path.splitext(fname)[1] not in TARGET_EXTS: continue
            
            full_path = os.path.join(dirpath, fname)
            rel_path = os.path.relpath(full_path, project_root)

            try:
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                # スキップ判定（空ファイルや巨大すぎるファイル）
                if not content.strip() or len(content) > 100000:
                    continue

                print(f"Processing: {rel_path} ...", end="", flush=True)
                
                # 9000文字程度でカット（API制限回避のため）
                vector = get_embedding(content[:9000]) 
                
                if vector:
                    # DBへ保存
                    # 重複登録を防ぐため、一度削除してから挿入する（簡易的な更新処理）
                    cursor.execute("DELETE FROM project_artifacts WHERE file_path = :1", [rel_path])
                    
                    cursor.execute("""
                        INSERT INTO project_artifacts 
                        (artifact_type, file_path, content, content_embedding, metadata)
                        VALUES (:1, :2, :3, :4, :5)
                    """, [
                        'CODE', 
                        rel_path, 
                        content, 
                        array.array('f', vector), 
                        '{"source": "init_script"}'
                    ])
                    print(" Done.")
                    count += 1
                else:
                    print(" Skipped (No vector).")
                    
            except Exception as e:
                print(f" Error: {e}")

    conn.commit()
    print(f"🎉 All files ingested successfully! ({count} files)")
    conn.close()

if __name__ == "__main__":
    main()