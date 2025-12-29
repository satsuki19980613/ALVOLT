import google.generativeai as genai
import os
from dotenv import load_dotenv

# 環境変数を読み込む
load_dotenv()

# APIキーを設定
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    print("Error: GOOGLE_API_KEYが見つかりません。.envを確認してください。")
else:
    genai.configure(api_key=api_key)

    print("=== あなたの環境で利用可能なGeminiモデル一覧 ===")
    try:
        # モデル一覧を取得して表示
        for m in genai.list_models():
            # "generateContent"（会話・文章生成）に対応しているモデルだけ表示
            if 'generateContent' in m.supported_generation_methods:
                print(f"- {m.name}")
    except Exception as e:
        print(f"エラーが発生しました: {e}")