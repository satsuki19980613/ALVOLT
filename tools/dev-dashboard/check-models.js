// tools/dev-dashboard/check-models.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function check() {
    console.log("🔍 APIキー:", process.env.GEMINI_API_KEY ? "読み込みOK" : "❌ 未設定");
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    try {
        console.log("📡 利用可能なモデルを取得中...");
        // 利用可能なモデル一覧を取得する
        const modelResponse = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 
        // ※ 本来は listModels() を使いたいが、SDKのバージョンによっては複雑なため
        //   まずは一番推奨されるモデルで疎通確認だけ行います。
        
        const result = await modelResponse.generateContent("Hello");
        console.log("✅ 接続成功！ gemini-1.5-flash は使用可能です。");
        console.log("🤖 返答:", result.response.text());
        
    } catch (error) {
        console.error("❌ エラー詳細:", error.message);
        console.log("\n💡 ヒント: APIキーが正しいか、Google AI Studioでキーが有効になっているか確認してください。");
    }
}

check();