// tools/dev-dashboard/debug-models.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const API_KEY = process.env.GEMINI_API_KEY;
const URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function listModels() {
    console.log("🔍 Googleサーバーに直接問い合わせ中...");
    
    try {
        const response = await fetch(URL);
        const data = await response.json();

        if (data.error) {
            console.error("❌ APIエラー:", data.error.message);
            return;
        }

        if (!data.models) {
            console.log("⚠️ モデルが見つかりませんでした。APIキーの設定を確認してください。");
            return;
        }

        console.log("\n✅ あなたのAPIキーで利用可能なモデル一覧:");
        console.log("------------------------------------------------");
        
        // "generateContent" に対応しているモデルだけを抽出して表示
        const availableModels = data.models
            .filter(m => m.supportedGenerationMethods.includes("generateContent"))
            .map(m => m.name.replace("models/", "")); // "models/" を除去して表示

        availableModels.forEach(name => {
            console.log(`・ ${name}`);
        });
        
        console.log("------------------------------------------------");
        console.log("👉 上記リストにある名前のいずれかを server.js に設定してください。");

    } catch (error) {
        console.error("❌ 通信エラー:", error.message);
    }
}

listModels();