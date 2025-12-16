import { PacketReader } from "./PacketReader.js"; // ※PacketReaderはハンドラに移動しましたが、sendInputで使用する場合は残します
import { BinaryProtocolHandler } from "./handlers/BinaryProtocolHandler.js"; // 【新規】
import { ClientConfig } from "../../core/config/ClientConfig.js";
export class NetworkClient {
  constructor() {
    this.serverUrl = "wss://alvolt-server-official-sjuxb5joza-an.a.run.app";
    this.serverUrl = ClientConfig.SERVER_URL; 
    
    // ローカル開発時のフォールバック（必要なら）
    if (location.hostname === 'localhost' && !this.serverUrl) {
        this.serverUrl = 'ws://localhost:8080';
    }
    this.ws = null;
    this.messageHandlers = new Map();
    this.isConnected = false;
    this.isIntentionalClose = false;
    this.isDebug = false;
    this.lastPacketTime = 0;
    this.stats = {
      pps_total: 0,
      bps_total: 0,
      total_bytes: 0,
      total_seconds: 0,
      jitter: 0,
      avgPing: 0,
    };
    this.tempStats = { pps_total: 0, bps_total: 0 };
    
    // 【新規】プロトコルハンドラーのインスタンス化
    this.protocolHandler = new BinaryProtocolHandler();

    this.statsInterval = setInterval(() => {
      if (this.stats) {
        this.stats.total_bytes += this.tempStats.bps_total;
        this.stats.total_seconds++;
        this.stats.pps_total = this.tempStats.pps_total;
        this.stats.bps_total = this.tempStats.bps_total;
        this.tempStats.pps_total = 0;
        this.tempStats.bps_total = 0;
      }
    }, 1000);

    
  }

  on(type, handler) {
    this.messageHandlers.set(type, handler);
  }

  connect(userId, playerName, isDebug, jitterRecorder = null) {
    return new Promise((resolve, reject) => {
      this.isIntentionalClose = false;
      this.isDebug = isDebug;
      this.jitterRecorder = jitterRecorder;

      // ▼ 修正: 変数を使わず、ここに直接「正しいURL」を書くことでミスを防ぎます
      // (末尾にスラッシュを入れないのがポイントです)
      const serverUrl = "wss://alvolt-server-official-sjuxb5joza-an.a.run.app";

      // ▼ 接続用URLを組み立て
      const url = `${serverUrl}/?userId=${encodeURIComponent(userId)}&playerName=${encodeURIComponent(playerName)}&debug=${isDebug}`;

      // ★デバッグログ: ブラウザのコンソールでこのURLをクリックして接続できるか確認できます
      console.log("【接続デバッグ】 接続しようとしているURL:", url);

      try {
        this.ws = new WebSocket(url);
        this.ws.binaryType = "arraybuffer";
      } catch (err) {
        console.error("【接続デバッグ】 WebSocket作成エラー:", err);
        reject(err);
        return;
      }

      this.ws.onopen = () => {
        console.log("【接続デバッグ】 WebSocket 接続成功！ (onopen)");
        this.isConnected = true;
      };

      this.ws.onmessage = (event) => {
        // ... (元の処理: handleBinaryMessageなどを呼ぶ)
        // ここは元のコードのままでOKですが、念のため記述します
        if (this.isDebug) { /* ...jitter計測など... */ }
        
        this.tempStats.pps_total++;
        this.tempStats.bps_total += event.data.byteLength || event.data.length;

        if (event.data instanceof ArrayBuffer) {
          this.handleBinaryMessage(event.data);
        } else {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "join_success") {
              console.log("【接続デバッグ】 ゲーム参加成功 (join_success)");
              resolve(msg);
            } else {
              const handler = this.messageHandlers.get(msg.type);
              if (handler) handler(msg.payload);
            }
          } catch (e) {
            console.warn("Invalid message", e);
          }
        }
      };

      this.ws.onerror = (e) => {
        // onerror は詳細な情報をくれないことが多いです
        console.error("【接続デバッグ】 WebSocket onerror 発生:", e);
        reject(e);
      };

      this.ws.onclose = (event) => {
        // ここが重要です。なぜ切れたかの理由 (code) がわかります
        console.log(`【接続デバッグ】 WebSocket 切断 (onclose): Code=${event.code}, Reason=${event.reason}, WasClean=${event.wasClean}`);
        
        this.isConnected = false;
        if (this.isIntentionalClose) {
          console.log("[Network] Intentional disconnect.");
          return;
        }
        const handler = this.messageHandlers.get("disconnect");
        if (handler) handler();
      };
    });
  }

  // 【変更】ハンドラーに移譲
  handleBinaryMessage(buffer) {
    // BinaryProtocolHandler に解析を委譲
    const delta = this.protocolHandler.parse(buffer);
    
    // 解析結果があればイベント発火
    if (delta) {
        const handler = this.messageHandlers.get("game_state_delta");
        if (handler) handler(delta);
    }
  }

  sendInput(seq, states, pressed, mousePos) {
    if (
      !this.isConnected ||
      !this.ws ||
      this.ws.readyState !== WebSocket.OPEN
    ) {
      return;
    }
    const buffer = new ArrayBuffer(15);
    const view = new DataView(buffer);

    let mask = 0;
    if (states.move_up) mask |= 1;
    if (states.move_down) mask |= 2;
    if (states.move_left) mask |= 4;
    if (states.move_right) mask |= 8;
    if (pressed.shoot) mask |= 16;
    if (pressed.trade_long) mask |= 32;
    if (pressed.bet_up) mask |= 64;
    if (pressed.bet_down) mask |= 128;
    if (pressed.bet_all) mask |= 256;
    if (pressed.bet_min) mask |= 512;
    if (pressed.trade_short) mask |= 1024;
    if (pressed.trade_settle) mask |= 2048;

    view.setUint8(0, 2);
    view.setUint16(1, mask, true);
    view.setUint32(3, seq, true);
    view.setFloat32(7, mousePos ? mousePos.x : 0, true);
    view.setFloat32(11, mousePos ? mousePos.y : 0, true);

    this.ws.send(buffer);
    this.stats.total_bytes += 15;
  }

  sendPause() {
    if (this.isConnected) this.ws.send(JSON.stringify({ type: "pause" }));
  }

  sendResume() {
    if (this.isConnected) this.ws.send(JSON.stringify({ type: "resume" }));
  }

  disconnect() {
    if (this.ws) {
      this.isIntentionalClose = true;
      this.ws.close();
      this.isConnected = false;
    }
  }

  getStats() {
    return this.stats;
  }
}