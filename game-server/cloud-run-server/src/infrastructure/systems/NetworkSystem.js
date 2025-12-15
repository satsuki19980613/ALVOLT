import { WebSocket } from "ws";
import { PacketWriter } from "../utils/PacketWriter.js";
import { Protocol, BulletType } from "../../core/constants/Protocol.js";
export class NetworkSystem {
  constructor() {
    this.playerWriters = new WeakMap();

    this.playerMapsPool = new WeakMap();
  }

  broadcastGameState(players, worldState) {
    players.forEach((player) => {
      if (!player.ws || player.ws.readyState !== WebSocket.OPEN) {
        return;
      }

      const relevantEntityMaps = this.getRelevantEntityMapsFor(
        player,
        worldState
      );

      let writer = this.playerWriters.get(player);
      if (!writer) {
        writer = new PacketWriter();
        this.playerWriters.set(player, writer);
      }
      writer.reset();

      const binaryData = this.createBinaryDelta(
        player.lastBroadcastState,
        relevantEntityMaps,
        writer,
        worldState.frameEvents
      );

      if (binaryData.length > 0) {
        this.safeSend(player.ws, binaryData);
      }

      player.lastBroadcastState = relevantEntityMaps;
    });
  }

  createBinaryDelta(oldEntityMaps, newEntityMaps, writer, events) {
    writer.u8(Protocol.MSG_TYPE_DELTA || 1);

    let removedCount = 0;
    const removedPlayersStart = writer.offset;
    writer.u8(0);
    if (oldEntityMaps && oldEntityMaps.players) {
      for (const id of oldEntityMaps.players.keys()) {
        if (!newEntityMaps.players.has(id)) {
          writer.string(id);
          removedCount++;
        }
      }
    }
    writer.buffer.writeUInt8(Math.min(removedCount, 255), removedPlayersStart);
    removedCount = 0;
    const removedEnemiesStart = writer.offset;
    writer.u8(0);
    if (oldEntityMaps && oldEntityMaps.enemies) {
      for (const id of oldEntityMaps.enemies.keys()) {
        if (!newEntityMaps.enemies.has(id)) {
          writer.string(id);
          removedCount++;
        }
      }
    }
    writer.buffer.writeUInt8(Math.min(removedCount, 255), removedEnemiesStart);
    removedCount = 0;
    const removedBulletsStart = writer.offset;
    writer.u16(0);
    if (oldEntityMaps && oldEntityMaps.bullets) {
      for (const id of oldEntityMaps.bullets.keys()) {
        if (!newEntityMaps.bullets.has(id)) {
          writer.string(id);
          removedCount++;
        }
      }
    }
    writer.buffer.writeUInt16LE(
      Math.min(removedCount, 65535),
      removedBulletsStart
    );
    writer.u8(Math.min(newEntityMaps.players.size, 255));
    for (const p of newEntityMaps.players.values()) {
      writer.string(p.id);
      writer.f32(p.x);
      writer.f32(p.y);
      const safeHp = Number.isNaN(p.hp) ? 0 : p.hp;
      writer.u8(Math.min(Math.max(0, Math.ceil(safeHp)), 255));
      writer.f32(p.angle);
      writer.f32(p.aimAngle || 0);
      writer.string(p.name || "Guest");
      writer.u32(p.lastProcessedInputSeq || 0);
      writer.u8(p.isDead ? 1 : 0);
      writer.u16(Math.floor(p.ep));
      writer.u16(p.chargeBetAmount || 10);
      if (p.chargePosition) {
        writer.u8(1);
        writer.f32(p.chargePosition.entryPrice);
        writer.f32(p.chargePosition.amount);
        const typeId = p.chargePosition.type === "short" ? 1 : 0;
        writer.u8(typeId);
      } else {
        writer.u8(0);
      }

      const bullets = p.stockedBullets || [];
      writer.u8(Math.min(bullets.length, 255));
      for (const b of bullets) {
        const dmg = typeof b === "object" ? b.damage : b;
        writer.u16(Math.ceil(dmg));
      }
    }

    writer.u8(Math.min(newEntityMaps.enemies.size, 255));
    for (const e of newEntityMaps.enemies.values()) {
      writer.string(e.id);
      writer.f32(e.x);
      writer.f32(e.y);
      writer.u8(Math.min(Math.max(0, Math.ceil(e.hp)), 255));
      writer.f32(e.targetAngle || 0);
    }

    writer.u16(Math.min(newEntityMaps.bullets.size, 65535));
    for (const b of newEntityMaps.bullets.values()) {
      writer.string(b.id);
      writer.f32(b.x);
      writer.f32(b.y);
      const angle = Math.atan2(b.vy, b.vx);
      writer.f32(angle);

      let typeId = 0;

      if (typeof b.type === "number") {
        typeId = b.type;
      } else {
        if (b.type === "enemy") typeId = BulletType.ENEMY;
      }

      writer.u8(typeId);
    }

    const safeEvents = events || [];
    writer.u8(Math.min(safeEvents.length, 255));
    for (const ev of safeEvents) {
      let typeId = 1;
      if (ev.type === "explosion") typeId = 2;
      writer.u8(typeId);
      writer.f32(ev.x);
      writer.f32(ev.y);
      writer.string(ev.color || "#ffffff");
    }

    return writer.getData();
  }

  getRelevantEntityMapsFor(player, worldState) {
    const VIEWPORT_RADIUS_SQ = 750 * 750;

    let poolData = this.playerMapsPool.get(player);
    if (!poolData) {
      poolData = {
        index: 0,
        buffers: [
          { players: new Map(), enemies: new Map(), bullets: new Map() },
          { players: new Map(), enemies: new Map(), bullets: new Map() },
        ],
      };
      this.playerMapsPool.set(player, poolData);
    }

    poolData.index = (poolData.index + 1) % 2;
    const buffer = poolData.buffers[poolData.index];

    buffer.players.clear();
    buffer.enemies.clear();
    buffer.bullets.clear();

    for (const p of worldState.players.values()) {
      if (p.id === player.id) {
        buffer.players.set(p.id, p);
      } else {
        const dx = p.x - player.x;
        const dy = p.y - player.y;
        if (dx * dx + dy * dy < VIEWPORT_RADIUS_SQ) {
          buffer.players.set(p.id, p);
        }
      }
    }

    for (const e of worldState.enemies) {
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      if (dx * dx + dy * dy < VIEWPORT_RADIUS_SQ) {
        buffer.enemies.set(e.id, e);
      }
    }

    for (const b of worldState.bullets) {
      const dx = b.x - player.x;
      const dy = b.y - player.y;
      if (dx * dx + dy * dy < VIEWPORT_RADIUS_SQ) {
        buffer.bullets.set(b.id, b);
      }
    }

    return buffer;
  }

  sendSnapshot(player, worldState) {
    const entityMaps = this.getRelevantEntityMapsFor(player, worldState);
    const snapshotPayload = {
      players: Array.from(entityMaps.players.values()).map((p) => ({
        i: p.id,
        x: p.x,
        y: p.y,
        h: p.hp,
        e: p.ep,
        a: p.angle,
        ta: p.aimAngle || 0,
        n: p.name,
        ba: p.chargeBetAmount,
        cp: p.chargePosition
          ? {
              ep: p.chargePosition.entryPrice,
              a: p.chargePosition.amount,
              t: p.chargePosition.type,
            }
          : null,
        sb: p.stockedBullets
          ? p.stockedBullets.map((b) => (typeof b === "object" ? b.damage : b))
          : [],
        d: p.isDead ? 1 : 0,
      })),
      enemies: Array.from(entityMaps.enemies.values()).map((e) => ({
        i: e.id,
        x: e.x,
        y: e.y,
        h: e.hp,
        ta: e.targetAngle,
      })),
      bullets: Array.from(entityMaps.bullets.values()).map((b) => ({
        i: b.id,
        x: b.x,
        y: b.y,
        r: b.radius,
        t: b.type,
        a: Math.atan2(b.vy, b.vx),
      })),
    };
    this.safeSend(
      player.ws,
      JSON.stringify({ type: "game_state_snapshot", payload: snapshotPayload })
    );
    player.lastBroadcastState = entityMaps;
  }

  broadcastLeaderboard(players, leaderboardData, serverStats) {
    const payload = { leaderboardData, serverStats };
    const message = JSON.stringify({ type: "leaderboard_update", payload });
    players.forEach((p) => this.safeSend(p.ws, message));
  }

  broadcastChartUpdate(players, chartDeltaState) {
    const message = JSON.stringify({
      type: "chart_update",
      payload: chartDeltaState,
    });
    players.forEach((p) => this.safeSend(p.ws, message));
  }

  safeSend(ws, msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(msg);
      } catch (e) {}
    }
  }
}
