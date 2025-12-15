import { PacketReader } from "./PacketReader.js";

/**
 * WebSocket通信クライアント
 */
export class WebSocketClient {
  constructor() {
    this.ws = null;
    this.messageHandlers = new Map();
    this.serverUrl = location.origin.replace(/^http/, "ws");
    this.isConnected = false;
  }

  on(type, handler) {
    this.messageHandlers.set(type, handler);
  }

  connect(userId, playerName, isDebug) {
    return new Promise((resolve, reject) => {
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
        const handler = this.messageHandlers.get("disconnect");
        if (handler) handler();
      };
    });
  }

  handleBinaryMessage(buffer) {
    const reader = new PacketReader(buffer);
    const msgType = reader.u8();

    if (msgType === 1) {
      const delta = {
        removed: { players: [], enemies: [], bullets: [] },
        updated: { players: [], enemies: [], bullets: [] },
        events: [],
      };

      const remP = reader.u8();
      for (let i = 0; i < remP; i++)
        delta.removed.players.push(reader.string());
      const remE = reader.u8();
      for (let i = 0; i < remE; i++)
        delta.removed.enemies.push(reader.string());
      const remB = reader.u16();
      for (let i = 0; i < remB; i++)
        delta.removed.bullets.push(reader.string());

      const numP = reader.u8();
      for (let i = 0; i < numP; i++) {
        const p = {
          i: reader.string(),
          x: reader.f32(),
          y: reader.f32(),
          h: reader.u8(),
          a: reader.f32(),
          ta: reader.f32(),
          n: reader.string(),
          lastAck: reader.u32(),
          d: reader.u8(),
          e: reader.u16(),
          ba: reader.u16(),
        };
        const hasCharge = reader.u8();
        if (hasCharge) {
          p.cp = {
            ep: reader.f32(),
            a: reader.f32(),
            t: reader.u8() === 1 ? "short" : "long",
          };
        }
        const stockCount = reader.u8();
        p.sb = [];
        for (let j = 0; j < stockCount; j++) p.sb.push(reader.u16());
        delta.updated.players.push(p);
      }

      const numE = reader.u8();
      for (let i = 0; i < numE; i++) {
        delta.updated.enemies.push({
          i: reader.string(),
          x: reader.f32(),
          y: reader.f32(),
          h: reader.u8(),
          ta: reader.f32(),
        });
      }

      const numB = reader.u16();
      for (let i = 0; i < numB; i++) {
        const b = {
          i: reader.string(),
          x: reader.f32(),
          y: reader.f32(),
          a: reader.f32(),
        };
        const tId = reader.u8();
        const types = [
          "player",
          "enemy",
          "player_special_1",
          "item_ep",
          "player_special_2",
          "player_special_3",
          "player_special_4",
        ];
        b.t = types[tId] || "player";
        delta.updated.bullets.push(b);
      }

      const numEv = reader.u8();
      for (let i = 0; i < numEv; i++) {
        const tId = reader.u8();
        delta.events.push({
          type: tId === 2 ? "explosion" : "hit",
          x: reader.f32(),
          y: reader.f32(),
          color: reader.string(),
        });
      }

      const handler = this.messageHandlers.get("game_state_delta");
      if (handler) handler(delta);
    }
  }

  sendInput(seq, states, pressed, mousePos) {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
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
  }
}
