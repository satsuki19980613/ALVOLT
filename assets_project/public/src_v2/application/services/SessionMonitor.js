// src_v2/application/services/SessionMonitor.js

export class SessionMonitor {
  constructor(authAdapter) {
    this.auth = authAdapter;
    this.checkIntervalId = null;
    this.CHECK_INTERVAL_MS = 5000;
  }

  /**
   * セッション監視を開始する
   * 多重起動防止のため、既に動いている場合は一度停止してから再開します
   */
  // SessionMonitor.js
start() {
    this.stop();
    this.checkIntervalId = setInterval(async () => {
        if (!this.auth.auth.currentUser) return;
        // 【修正】true (強制通信) ではなく false (キャッシュ) にする
        // または、ゲーム中は実行しない判定を入れる
        await this.auth.auth.currentUser.getIdToken(false); 
    }, this.CHECK_INTERVAL_MS); // 間隔も5秒(5000)ではなく、もっと長くても良い
}

  /**
   * セッション監視を停止する
   */
  stop() {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }
}