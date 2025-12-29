import os
import oracledb
import google.generativeai as genai
from dotenv import load_dotenv
import array
import warnings
import sys
from mcp.server.fastmcp import FastMCP

# Windowsでの文字化け防止のため、標準出力をUTF-8に強制（念のため）
sys.stdout.reconfigure(encoding='utf-8')

# 警告の抑制
warnings.filterwarnings("ignore", category=FutureWarning)

# 環境設定
load_dotenv()

# Gemini設定
try:
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
    EMBEDDING_MODEL = "models/text-embedding-004"
except ImportError:
    pass

# MCPサーバーの定義
mcp = FastMCP("Alvolt Memory Bank")

def get_db_connection():
    """Oracle DBへの接続を取得する"""
    return oracledb.connect(
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        dsn=os.getenv("DB_DSN"),
        config_dir=os.getenv("WALLET_DIR"),
        wallet_location=os.getenv("WALLET_DIR"),
        wallet_password=os.getenv("DB_PASSWORD")
    )

def get_embedding(text):
    """テキストをベクトル化する"""
    try:
        res = genai.embed_content(model=EMBEDDING_MODEL, content=text)
        return res['embedding']
    except Exception as e:
        return None

@mcp.tool()
def search_codebase(query: str) -> str:
    """
    ユーザーの質問に基づいて、プロジェクトのコードベース（Oracle DB）を意味検索します。
    コードの仕様、ロジック、場所などを知りたいときに使用してください。
    """
    # エンコーディングエラーを防ぐため、クエリを安全に処理
    try:
        query = query.encode('utf-8', errors='ignore').decode('utf-8')
    except:
        pass
    print(f"Searching for: {query}")
    
    vector = get_embedding(query)
    if not vector:
        return "Error: Failed to generate embedding for query."

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # ベクトル類似度検索 (Top 5)
        sql = """
            SELECT file_path, content, 
                   VECTOR_DISTANCE(content_embedding, :1, COSINE) as distance
            FROM project_artifacts
            ORDER BY distance ASC
            FETCH FIRST 5 ROWS ONLY
        """
        
        cursor.execute(sql, [array.array('f', vector)])
        results = cursor.fetchall()
        
        if not results:
            return "No relevant code found."

        # 結果の整形
        response_text = f"Found {len(results)} relevant files for '{query}':\n\n"
        for row in results:
            file_path = row[0]
            # 先頭2000文字
            content_preview = row[1].read()[:2000] 
            distance = row[2]
            
            response_text += f"=== FILE: {file_path} (Relevance: {1-distance:.2f}) ===\n"
            response_text += f"{content_preview}\n"
            response_text += "...\n\n"

        conn.close()
        return response_text

    except Exception as e:
        return f"Database Error: {e}"

if __name__ == "__main__":
    mcp.run()