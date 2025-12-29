import os
import time
import oracledb
import google.generativeai as genai
from dotenv import load_dotenv
import array
import sys
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# 文字化け対策
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

load_dotenv()

# --- 設定 ---
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
EMBEDDING_MODEL = "models/text-embedding-004"
TARGET_EXTS = {'.js', '.json', '.html', '.css', '.md', '.txt'}
IGNORE_DIRS = {'node_modules', '.git', 'dist', 'wallet', 'assets', '.next', '__pycache__', 'memory_bank_scripts'}

# 監視対象のルートディレクトリ（スクリプトの一つ上 = プロジェクトルート）
# ※ご自身のフォルダ構成に合わせて調整してください
PROJECT_ROOT = os.path.abspath(os.path.join(os.getcwd(), "..")) 

def get_db_connection():
    return oracledb.connect(
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        dsn=os.getenv("DB_DSN"),
        config_dir=os.getenv("WALLET_DIR"),
        wallet_location=os.getenv("WALLET_DIR"),
        wallet_password=os.getenv("DB_PASSWORD")
    )

def get_embedding(text):
    try:
        # 短すぎる変更は無視
        if not text or len(text) < 5: return None
        res = genai.embed_content(model=EMBEDDING_MODEL, content=text)
        return res['embedding']
    except Exception as e:
        print(f"⚠️ Embedding Error: {e}")
        return None

def update_file_in_db(file_path):
    """
    指定されたファイルを読み込み、DBを更新（DELETE -> INSERT）する
    """
    rel_path = os.path.relpath(file_path, PROJECT_ROOT)
    
    # 除外ディレクトリチェック
    parts = rel_path.split(os.sep)
    for part in parts:
        if part in IGNORE_DIRS: return

    # 拡張子チェック
    ext = os.path.splitext(file_path)[1]
    if ext not in TARGET_EXTS: return

    print(f"🔄 Detected change: {rel_path}")

    try:
        # ファイル読み込み（保存直後はロックされていることがあるのでリトライ）
        content = ""
        for _ in range(3):
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                break
            except:
                time.sleep(0.5)
        
        if not content: return

        # ベクトル化
        vector = get_embedding(content[:9000])
        if not vector: return

        # DB更新
        conn = get_db_connection()
        cursor = conn.cursor()

        # 1. 古い記憶を消す
        cursor.execute("DELETE FROM project_artifacts WHERE file_path = :1", [rel_path])
        
        # 2. 新しい記憶を入れる
        cursor.execute("""
            INSERT INTO project_artifacts 
            (artifact_type, file_path, content, content_embedding, metadata)
            VALUES (:1, :2, :3, :4, :5)
        """, [
            'CODE', 
            rel_path, 
            content, 
            array.array('f', vector), 
            '{"source": "auto_sync"}'
        ])

        conn.commit()
        cursor.close()
        conn.close()
        print(f"✅ Synced: {rel_path}")

    except Exception as e:
        print(f"❌ Sync Failed: {e}")

class MemoryBankHandler(FileSystemEventHandler):
    """ファイルシステムの変更イベントをハンドリングするクラス"""
    
    def on_modified(self, event):
        if not event.is_directory:
            update_file_in_db(event.src_path)

    def on_created(self, event):
        if not event.is_directory:
            update_file_in_db(event.src_path)
            
    # ※削除イベント(on_deleted)も本来は実装すべきですが、
    #  誤って消したときに記憶まで消えると困る場合があるため、今回は「更新」のみに絞っています。

if __name__ == "__main__":
    print(f"👀 Watching for changes in: {PROJECT_ROOT}")
    print("------------------------------------------------")
    
    event_handler = MemoryBankHandler()
    observer = Observer()
    observer.schedule(event_handler, PROJECT_ROOT, recursive=True)
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    
    observer.join()