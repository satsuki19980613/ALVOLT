import { PacketReader } from "./PacketReader.js"; // ※PacketReaderはハンドラに移動しましたが、sendInputで使用する場合は残します
import { BinaryProtocolHandler } from "./handlers/BinaryProtocolHandler.js"; // 【新規】

export class NetworkClient {
  constructor() {
    this.serverUrl = location.origin.replace(/^http/, "ws");
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
      const url = `${this.serverUrl}/?userId=${encodeURIComponent(
        userId
      )}&playerName=${encodeURIComponent(playerName)}&debug=${isDebug}`;

      this.ws = new WebSocket(url);
      this.ws.binaryType = "arraybuffer";

      this.ws.onopen = () => {
        this.isConnected = true;
        console.log("WebSocket connected.");
      };

      this.ws.onmessage = (event) => {
        if (this.isDebug) {
          const now = performance.now();
          if (this.lastPacketTime > 0) {
            const interval = now - this.lastPacketTime;
            const diff = Math.abs(interval - 33.33);
            this.stats.jitter = (this.stats.jitter || 0) * 0.9 + diff * 0.1;
            if (this.jitterRecorder) {
              this.jitterRecorder.addSample(diff);
            }
          }
          this.lastPacketTime = now;
        }
        
        this.tempStats.pps_total++;
        this.tempStats.bps_total += event.data.byteLength || event.data.length;

        if (event.data instanceof ArrayBuffer) {
          this.handleBinaryMessage(event.data);
        } else {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "join_success") {
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

      this.ws.onerror = (e) => reject(e);
      this.ws.onclose = () => {
        this.isConnected = false;
        if (this.isIntentionalClose) {
          console.log("[Network] Intentional disconnect (Retire).");
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