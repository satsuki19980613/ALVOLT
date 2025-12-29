import os
import time
import oracledb
import google.generativeai as genai
from dotenv import load_dotenv
import array
import sys

# 文字化け対策
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

load_dotenv()

# --- 設定 ---
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
EMBEDDING_MODEL = "models/text-embedding-004"
# モデル名はご自身の環境に合わせて変更してください（gemini-1.5-flash-001 など）
CHAT_MODEL = "models/gemini-2.0-flash-001"

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
        time.sleep(1) # API制限回避
        res = genai.embed_content(model=EMBEDDING_MODEL, content=text)
        return res['embedding']
    except: return None

# --- 💾 メモリ操作機能 ---

def save_episode(role, text):
    """会話をエピソード記憶としてDBに保存"""
    vector = get_embedding(text)
    if not vector: return

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO episodic_memory (role, content, content_embedding)
            VALUES (:1, :2, :3)
        """, [role, text, array.array('f', vector)])
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error saving episode: {e}")

def recall_past_episodes(query):
    """現在の会話に関連する過去の会話(エピソード)を思い出す"""
    vector = get_embedding(query)
    if not vector: return ""

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        sql = """
            SELECT role, content, created_at,
                   VECTOR_DISTANCE(content_embedding, :1, COSINE) as distance
            FROM episodic_memory
            ORDER BY distance ASC
            FETCH FIRST 5 ROWS ONLY
        """
        cursor.execute(sql, [array.array('f', vector)])
        results = cursor.fetchall()

        if not results: 
            conn.close()
            return ""
        
        # 【修正】接続が生きている間にデータを読み取る
        memory_text = "\n=== 🕰️ Past Related Conversations (Episodic Memory) ===\n"
        for row in results:
            role = row[0]
            # LOBオブジェクトからテキストを読み出す
            content = row[1].read() 
            memory_text += f"- [{role}]: {content[:200]}...\n"
        
        conn.close()
        memory_text += "=====================================================\n"
        return memory_text

    except Exception as e:
        return f"Memory Recall Error: {e}"

# --- 🛠️ 既存ツール (コード検索) ---

def search_codebase_semantic(query: str):
    """コードベースの意味検索（Semantic Memory）"""
    time.sleep(2)
    print(f"\n[System] 🔍 Searching Semantic Memory for: '{query}'...")
    
    vector = get_embedding(query)
    if not vector: return "Error"
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        sql = """
            SELECT file_path, VECTOR_DISTANCE(content_embedding, :1, COSINE) as dist
            FROM project_artifacts ORDER BY dist ASC FETCH FIRST 5 ROWS ONLY
        """
        cursor.execute(sql, [array.array('f', vector)])
        results = cursor.fetchall()
        conn.close()
        
        if not results: return "No files found."
        return "\n".join([f"- {r[0]}" for r in results])
    except Exception as e:
        return f"Database Error: {e}"

def read_file_content(file_path: str):
    """ファイルの中身を読む"""
    time.sleep(2)
    print(f"\n[System] 📖 Reading file: '{file_path}'...")
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT file_path, content FROM project_artifacts WHERE file_path LIKE :1 FETCH FIRST 1 ROWS ONLY", [f"%{file_path}%"])
        row = cursor.fetchone()
        
        if not row: 
            conn.close()
            return "File not found."
        
        # 【修正】ここも接続が生きている間に読み取る
        real_path = row[0]
        file_content = row[1].read()
        
        conn.close()
        return f"=== FILE: {real_path} ===\n{file_content}\n"
    except Exception as e:
        return f"Database Error: {e}"

# --- 🤖 エージェント本体 ---

tools = [search_codebase_semantic, read_file_content]

system_instruction = """
あなたはALVOLTプロジェクトのAIエンジニアです。
ユーザーの質問に対し、以下の「2つの記憶」を駆使して回答してください。

1. **Semantic Memory (コード検索)**: コードの仕様や実装詳細が必要な場合に使用。
2. **Episodic Memory (会話履歴)**: 自動的に提供されます。過去の経緯を踏まえて回答してください。

常に日本語で回答し、コード変更が必要な場合は具体的なコードブロックを提示してください。
"""

model = genai.GenerativeModel(
    model_name=CHAT_MODEL,
    tools=tools,
    system_instruction=system_instruction
)

chat = model.start_chat(enable_automatic_function_calling=True)

print("🤖 ALVOLT Agent with Memory Engineering (Ready)")
print("-------------------------------------------------")

while True:
    try:
        user_input = input("\nYou: ")
        if user_input.lower() in ["exit", "quit"]: break

        save_episode('user', user_input)
        
        past_memories = recall_past_episodes(user_input)
        full_prompt = f"{past_memories}\nUser Query: {user_input}"
        
        response = chat.send_message(full_prompt)
        print(f"Gemini: {response.text}")

        save_episode('assistant', response.text)

    except Exception as e:
        print(f"Error: {e}")