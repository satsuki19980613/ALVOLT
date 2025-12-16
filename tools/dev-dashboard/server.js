const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = 3000;
const ROOT_DIR = path.resolve(__dirname, '../../');
const FIREBASE_DIR = path.join(ROOT_DIR, 'assets_project');
// ★追加: サーバーサイドデプロイ用のディレクトリパス
const SERVER_DEPLOY_DIR = path.join(ROOT_DIR, 'game-server', 'cloud-run-server');

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json({ limit: '50mb' }));

// --- Gemini API 初期化 ---
let model = null;
if (process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
} else {
    console.warn("⚠️ WARNING: GEMINI_API_KEY is not set.");
}

function runCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, { cwd: ROOT_DIR, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            if (error) { console.error(`Exec error: ${error}`); reject(stderr || error.message); return; }
            resolve(stdout);
        });
    });
}

function runFirebaseCommand(command) {
    return new Promise((resolve, reject) => {
        // assets_project ディレクトリで実行
        exec(command, { cwd: FIREBASE_DIR, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            if (error) { console.error(`Firebase Error: ${error}`); reject(stderr || error.message); return; }
            resolve(stdout);
        });
    });
}

// ★追加: サーバーデプロイ用コマンド実行関数
function runServerCommand(command) {
    return new Promise((resolve, reject) => {
        // game-server/cloud-run-server ディレクトリで実行
        exec(command, { cwd: SERVER_DEPLOY_DIR, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            if (error) { console.error(`Server Deploy Error: ${error}`); reject(stderr || error.message); return; }
            resolve(stdout);
        });
    });
}

// --- 1. ディレクトリ構造生成機能 ---
function getDirectoryStructure(dir, prefix = '') {
    const IGNORE_LIST = ['.git', 'node_modules', 'dist', 'build', '.DS_Store', 'package-lock.json', '.env', '.firebaserc'];
    let output = '';
    let items = [];
    try {
        items = fs.readdirSync(dir).filter(item => !IGNORE_LIST.includes(item));
    } catch (e) { return ''; }

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const isLast = (i === items.length - 1);
        const fullPath = path.join(dir, item);
        let stat;
        try { stat = fs.statSync(fullPath); } catch (e) { continue; }

        const connector = isLast ? '└── ' : '├── ';
        output += `${prefix}${connector}${item}\n`;

        if (stat.isDirectory()) {
            const childPrefix = isLast ? '    ' : '│   ';
            output += getDirectoryStructure(fullPath, prefix + childPrefix);
        }
    }
    return output;
}

// --- 2. 全コード取得機能 ---
function getProjectContext() {
    const targetDirs = ['assets_project/public/src_v2', 'game-server/cloud-run-server/src'];
    const validExtensions = ['.js', '.json', '.html', '.css', '.md'];
    const ignoreList = ['node_modules', 'dist', 'build', 'package-lock.json', '.git'];
    let fullContent = "";

    function walkDir(dir) {
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (ignoreList.includes(file)) continue;

            if (stat.isDirectory()) {
                walkDir(fullPath);
            } else {
                const ext = path.extname(file);
                if (validExtensions.includes(ext)) {
                    const relativePath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');
                    try {
                        const content = fs.readFileSync(fullPath, 'utf-8');
                        fullContent += `\n=== FILE: ${relativePath} ===\n${content}\n`;
                    } catch (e) {}
                }
            }
        }
    }
    targetDirs.forEach(d => walkDir(path.join(ROOT_DIR, d)));
    return fullContent;
}

// ==========================================
// API Endpoints
// ==========================================

app.get('/api/status', async (req, res) => {
    try {
        const branch = (await runCommand('git branch --show-current')).trim();
        const status = await runCommand('git status --short');
        res.json({ branch, status });
    } catch (e) { res.status(500).json({ error: e.toString() }); }
});

app.post('/api/audit', async (req, res) => {
    try {
        if (!model) return res.json({ result: "ERROR", aiResponse: "API Key missing." });

        const diff = await runCommand('git diff HEAD');
        if (!diff || diff.trim() === "") return res.json({ result: "NO_DIFF", aiResponse: "変更差分がありません。" });

        const rulesPath = path.join(ROOT_DIR, '.cursorrules');
        const rules = fs.existsSync(rulesPath) ? fs.readFileSync(rulesPath, 'utf-8') : "特になし";

        console.log("📚 Reading codebase...");
        const fullCodebase = getProjectContext();

        console.log("🌲 Reading directory structure...");
        const treeStructure = getDirectoryStructure(ROOT_DIR);

        const prompt = `
あなたはALVOLTプロジェクトのリードエンジニアです。
プロジェクトの「全体構造(Tree)」「全ソースコード(Context)」「今回の変更差分(Diff)」を渡します。
これらを統合的に分析し、変更内容を厳格に審査してください。

【審査基準】
1. アーキテクチャ整合性: ディレクトリ構造や既存設計(DDD等)に合致しているか？
2. 影響範囲: 変更が他のモジュールに悪影響を与えていないか？
3. 品質: マジックナンバー、命名規則、パフォーマンス。

【プロジェクトルール (.cursorrules)】
${rules}

【プロジェクトディレクトリ構造】
\`\`\`
${treeStructure}
\`\`\`

【今回の変更差分 (Git Diff)】
\`\`\`diff
${diff}
\`\`\`

【参考: プロジェクト全コード】
${fullCodebase}

【指示】
・問題がない場合は、必ず回答の冒頭に「PASS」という単語を書いてください。
・問題がある場合は、冒頭に「FAIL」と書き、具体的な違反箇所と修正コードを提示してください。
`;

        console.log("🤖 Asking Gemini (Full Context + Tree)...");
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log("🤖 Gemini Answered.");
        res.json({ result: "OK", aiResponse: text });

    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: e.toString() }); 
    }
});

app.post('/api/deploy-test', async (req, res) => {
    const { message } = req.body;
    let branchName = ""; 
    let currentBranch = "";

    try {
        currentBranch = (await runCommand('git branch --show-current')).trim();
        branchName = `fix/${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 12)}`;

        // 1. ブランチ作成 & コミット
        await runCommand(`git checkout -b ${branchName}`);
        await runCommand('git add .');
        await runCommand(`git commit -m "${message}"`);

        // 2. Client Deploy (Test Environment)
        console.log("🚀 Deploying Client to Dev (Firebase)...");
        await runFirebaseCommand('firebase deploy --project alvolt-dev --only hosting');

        // 3. Server Deploy (Test Environment)
        console.log("🚀 Deploying Server to Dev (Cloud Run)...");
        await runServerCommand('gcloud run deploy alvolt-server-dev --source . --project alvolt-dev --region asia-northeast1 --allow-unauthenticated');

        res.json({ success: true, branch: branchName });

    } catch (e) { 
        console.error("❌ Deploy Failed. Rolling back...");
        
        try {
            if (currentBranch) await runCommand(`git checkout ${currentBranch}`);
            if (branchName) {
                await runCommand(`git branch -D ${branchName}`);
                console.log(`🗑️ Cleaned up branch: ${branchName}`);
            }
        } catch (cleanupError) {
            console.error("⚠️ Cleanup failed:", cleanupError);
        }

        res.status(500).json({ error: e.toString() + "\n(作成されたブランチは自動削除されました)" }); 
    }
});

app.post('/api/deploy-prod', async (req, res) => {
    try {
        const currentBranch = (await runCommand('git branch --show-current')).trim();
        if (currentBranch === 'main') throw new Error("Main branch protection.");
        
        // 1. Merge to Main
        await runCommand('git checkout main');
        await runCommand(`git merge ${currentBranch}`);
        
        // 2. Tagging
        const tagName = `release-${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 12)}`;
        await runCommand(`git tag ${tagName}`);
        
        console.log("☁️ Pushing to GitHub/Remote...");
        await runCommand('git push origin main');       // テスト
        await runCommand(`git push origin ${tagName}`);

        // 3. Client Deploy (Production Environment)
        console.log("🚀 Deploying Client to Production (Firebase)...");
        await runFirebaseCommand('firebase deploy --project alvolt-official --only hosting');

        // 4. Server Deploy (Production Environment)
        console.log("🚀 Deploying Server to Production (Cloud Run)...");
        await runServerCommand('gcloud run deploy alvolt-server-official --source . --project alvolt-official --region asia-northeast1 --allow-unauthenticated');

        // 5. Cleanup
        await runCommand(`git branch -D ${currentBranch}`);
        res.json({ success: true, tag: tagName });

    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: e.toString() }); 
    }
});

app.listen(PORT, () => {
    console.log(`🚀 ALVOLT Dev Manager (Tree + Context Edition) running at http://localhost:${PORT}`);
});