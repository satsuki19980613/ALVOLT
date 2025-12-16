// 本番用 (Official) と テスト用 (Dev) の設定を分けて管理します
export const ENV = {
    // ==========================================
    // 1. 本番環境 (alvolt-official)
    // ==========================================
    OFFICIAL: {
        apiKey: "AIzaSyDJ7vJne6refUBZQHLz56N-T5s7vV2xuQw",
        authDomain: "alvolt-official.firebaseapp.com",
        projectId: "alvolt-official",
        storageBucket: "alvolt-official.firebasestorage.app",
        messagingSenderId: "681778557026",
        appId: "1:681778557026:web:9c9f008ae2e80dc7f9613b",
        measurementId: "G-XWVF602LNC"
    },
    // 本番サーバーURL (wss://...)
    GAME_SERVER_URL_OFFICIAL:"wss://alvolt-server-official-sjuxb5joza-an.a.run.app",


    // ==========================================
    // 2. テスト環境 (alvolt-dev)
    // ==========================================
    DEV: {
        apiKey: "AIzaSyBUFf8-AuS6G3C3nsrW293UCbhDNv_E2Y4",
        authDomain: "alvolt-dev.firebaseapp.com",
        projectId: "alvolt-dev",
        storageBucket: "alvolt-dev.firebasestorage.app",
        messagingSenderId: "925098933770",
        appId: "1:925098933770:web:4303d45eb87809fdac29f3",
        measurementId: "G-T8VX13W5M1"
    },
    // テストサーバーURL (さっき作った dev のURL)
    GAME_SERVER_URL_DEV: "wss://alvolt-server-dev-htrkpeac2a-an.a.run.app",
};