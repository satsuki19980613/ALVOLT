const fs = require('fs');
const path = require('path');

// プロジェクトルートへのパス (tools/dev-dashboard/ から見て2階層上)
const ROOT_DIR = path.resolve(__dirname, '../../');
const OUTPUT_FILE = path.join(ROOT_DIR, 'alvolt_full_dump.txt');

function getProjectContext() {
    console.log(`📂 プロジェクトルート: ${ROOT_DIR}`);

    // 読み込むフォルダ
    const targetDirs = [
        'assets_project/public/src_v2', // クライアント
        'game-server',                  // サーバー
        'tools'                         // ツール
    ];
    
    // 読み込む拡張子
    const validExtensions = ['.js', '.json', '.html', '.css', '.md'];
    
    // 無視するリスト
    const ignoreList = ['node_modules', 'dist', 'build', 'package-lock.json', '.git', '.DS_Store'];

    let fullContent = "";
    let fileCount = 0;

    function walkDir(dir) {
        if (!fs.existsSync(dir)) {
            console.warn(`⚠️ フォルダが見つかりません: ${dir}`);
            return;
        }
        
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
                    // プロジェクトルートからの相対パス
                    const relativePath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');
                    try {
                        const content = fs.readFileSync(fullPath, 'utf-8');
                        
                        // 区切り線とファイル名を追加
                        fullContent += `\n================================================\n`;
                        fullContent += `FILE: ${relativePath}\n`;
                        fullContent += `================================================\n`;
                        fullContent += content + "\n";
                        
                        fileCount++;
                        process.stdout.write("."); // 進行状況を表示
                    } catch (e) {
                        console.warn(`\n❌ 読込エラー: ${relativePath}`);
                    }
                }
            }
        }
    }

    console.log("収集開始...");
    targetDirs.forEach(d => walkDir(path.join(ROOT_DIR, d)));
    console.log(`\n✅ 収集完了: ${fileCount} ファイル`);
    
    return fullContent;
}

// 実行
try {
    const content = getProjectContext();
    fs.writeFileSync(OUTPUT_FILE, content, 'utf-8');
    
    console.log(`\n📄 ダンプファイルを作成しました:`);
    console.log(`   ${OUTPUT_FILE}`);
    console.log(`   サイズ: ${(content.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`\n👉 このファイルを開いて、意図したコードが含まれているか確認してください。`);
} catch (e) {
    console.error("エラー:", e);
}