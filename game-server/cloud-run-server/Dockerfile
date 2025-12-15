# 1. ベースとなるNode.jsのバージョンを指定
# (あなたのローカル環境 v22.17.1 に合わせます)
FROM node:18-slim
# 2. アプリケーションの作業ディレクトリを作成
WORKDIR /usr/src/app

# 3. package.json と package-lock.json をコピー
COPY package*.json ./

# 4. 本番環境に必要なパッケージのみインストール
RUN npm install --only=production

# 5. アプリケーションのソースコードをすべてコピー
COPY . .

# 6. index.js で指定したポート 8080 を開放
EXPOSE 8080

# 7. サーバーを起動するコマンド
CMD [ "npm", "start" ]