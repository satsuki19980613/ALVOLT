const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 3333;

const server = http.createServer((req, res) => {
    // HTMLの配信
    if (req.url === '/' && req.method === 'GET') {
        fs.readFile(path.join(__dirname, 'dashboard.html'), (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading dashboard');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(data);
        });
        return;
    }

    // API: コマンド実行
    if (req.url === '/api/run' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            const { action, input } = JSON.parse(body);
            let command = '';

            try {
                switch(action) {
                    case 'start':
                        // featureブランチを作成して移動
                        const branchName = `feature/${input.trim().replace(/\s+/g, '-')}`;
                        // mainを最新にしてから分岐する安全策
                        command = `git checkout main 2>nul || git checkout -b main && git pull origin main 2>nul && git checkout -b ${branchName}`;
                        break;
                    
                    case 'pack':
                        // 全コードをクリップボードにコピーするスクリプトを実行
                        // ※ scripts/pack-context.js が存在することを前提とします
                        command = `node scripts/pack-context.js`;
                        break;

                    case 'save':
                        // コミットしてプッシュ（作業保存）
                        command = `git add . && git commit -m "${input}"`; 
                        // 必要であれば && git push origin HEAD を追加
                        break;

                    case 'finish':
                        // 空コミットでPRトリガー用更新を行う（必要に応じて調整）
                        command = `git add . && git commit -m "Ready for Review" --allow-empty`;
                        // && git push origin HEAD を追加推奨
                        break;

                    case 'sync':
                        // 最新のmainを取り込む
                        command = `git checkout main && git pull origin main`;
                        break;
                }

                console.log(`Executing: ${command}`);
                
                // コマンド実行
                exec(command, (error, stdout, stderr) => {
                    const output = stdout || stderr || error?.message;
                    // packコマンドは標準出力に "Copied" 等が出るのでそれを返す
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: !error, output: output }));
                });

            } catch (e) {
                res.writeHead(500);
                res.end(JSON.stringify({ success: false, output: e.message }));
            }
        });
        return;
    }
});

server.listen(PORT, () => {
    console.log(`\n✨ ALVOLT COCKPIT ONLINE: http://localhost:${PORT}`);
    // 自動でブラウザを開く
    const startCmd = process.platform == 'darwin' ? 'open' : 'start';
    exec(`${startCmd} http://localhost:${PORT}`);
});