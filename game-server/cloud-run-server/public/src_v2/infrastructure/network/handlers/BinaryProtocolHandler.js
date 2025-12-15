// src_v2/infrastructure/network/handlers/BinaryProtocolHandler.js
import { PacketReader } from "../PacketReader.js";

export class BinaryProtocolHandler {
  constructor() {}

  /**
   * バイナリデータを解析してデルタオブジェクトを返します
   * @param {ArrayBuffer} buffer 
   * @returns {Object|null} 解析結果のオブジェクト、または解析対象外ならnull
   */
  parse(buffer) {
    const reader = new PacketReader(buffer);
    const msgType = reader.u8();

    // MSG_TYPE_DELTA = 1
    if (msgType === 1) {
      return this._parseDelta(reader);
    }
    
    return null;
  }

  _parseDelta(reader) {
    const delta = {
      removed: { players: [], enemies: [], bullets: [] },
      updated: { players: [], enemies: [], bullets: [] },
      events: [],
    };

    // --- Removed Entities ---
    const remP = reader.u8();
    for (let i = 0; i < remP; i++) delta.removed.players.push(reader.string());

    const remE = reader.u8();
    for (let i = 0; i < remE; i++) delta.removed.enemies.push(reader.string());

    const remB = reader.u16();
    for (let i = 0; i < remB; i++) delta.removed.bullets.push(reader.string());

    // --- Updated Players ---
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

    // --- Updated Enemies ---
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

    // --- Updated Bullets ---
    const numB = reader.u16();
    for (let i = 0; i < numB; i++) {
      const b = {
        i: reader.string(),
        x: reader.f32(),
        y: reader.f32(),
        a: reader.f32(),
      };
      const tId = reader.u8();
      
      // 【修正】配列による文字列変換を削除し、ID(数値)をそのまま渡す
      // PixiRendererは ASSET_MAP[数値] を期待しているため
      b.t = tId;
      
      delta.updated.bullets.push(b);
    }

    // --- Events ---
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

    return delta;
  }
}