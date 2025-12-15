import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocket } from "ws";
import { WorldState } from "../domain/WorldState.js";
import { PlayerState } from "../domain/PlayerState.js";
import { GameConstants } from "../core/constants/GameConstants.js";
import { PhysicsSystem } from "../infrastructure/systems/PhysicsSystem.js";
import { NetworkSystem } from "../infrastructure/systems/NetworkSystem.js";
import { PersistenceSystem } from "../infrastructure/systems/PersistenceSystem.js";
import { WarmupSystem } from "../infrastructure/systems/WarmupSystem.js";
import { EnemySystem } from "../infrastructure/systems/EnemySystem.js";
import { PlayerSystem } from "../infrastructure/systems/PlayerSystem.js";
import { MapLoader } from "../infrastructure/factories/MapLoader.js";
import { ItemSystem } from "../infrastructure/systems/ItemSystem.js";
import { TradingSystem } from "../domain/systems/TradingSystem.js";
import { GameLoop } from "./GameLoop.js";
import { PlayerActionDispatcher } from "./services/PlayerActionDispatcher.js"; // 【新規】インポート

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let CACHED_MAP_DATA = null;
try {
  const mapPath = path.join(__dirname, "../../maps/map_default.json");
  if (fs.existsSync(mapPath)) {
    const mapJson = fs.readFileSync(mapPath, "utf8");
    CACHED_MAP_DATA = JSON.parse(mapJson);
  } else {
    CACHED_MAP_DATA = {};
  }
} catch (error) {
  CACHED_MAP_DATA = {};
}

export class ServerGame {
  constructor(roomId, firestore, onRoomEmptyCallback) {
    this.roomId = roomId;
    this.onRoomEmptyCallback = onRoomEmptyCallback;
    this.worldState = new WorldState();

    this.physicsSystem = new PhysicsSystem(
      GameConstants.WORLD_WIDTH,
      GameConstants.WORLD_HEIGHT
    );
    this.networkSystem = new NetworkSystem();
    this.persistenceSystem = new PersistenceSystem(firestore);
    this.tradingSystem = new TradingSystem();
    this.warmupSystem = new WarmupSystem(this);
    this.enemySystem = new EnemySystem(this);
    this.playerSystem = new PlayerSystem(this);
    this.loopManager = new GameLoop();
    this.itemSystem = new ItemSystem(this);

    // 【新規】アクションディスパッチャーの初期化
    this.actionDispatcher = new PlayerActionDispatcher(
      this.playerSystem,
      this.tradingSystem,
      this
    );
  }

  async warmup() {
    await this.warmupSystem.start();
  }

  initWorld() {
    MapLoader.loadMapData(this.worldState, CACHED_MAP_DATA || {});
    this.tradingSystem.init();
    for (let i = 0; i < 3; i++) {
      this.enemySystem.spawnEnemy();
    }
  }

  startLoop() {
    if (this.worldState.isRunning) return;
    this.worldState.isRunning = true;
    this.loopManager.start(
      "update",
      this.update.bind(this),
      GameConstants.GAME_LOOP_INTERVAL
    );
    this.loopManager.start(
      "broadcast",
      this.broadcastGameState.bind(this),
      GameConstants.BROADCAST_INTERVAL
    );
    this.loopManager.start(
      "chart",
      this.updateChart.bind(this),
      GameConstants.CHART_UPDATE_INTERVAL
    );
    this.loopManager.start(
      "leaderboard",
      this.broadcastLeaderboard.bind(this),
      2000
    );
  }

  stopLoop() {
    this.worldState.isRunning = false;
    this.loopManager.stopAll();
    if (this.onRoomEmptyCallback) this.onRoomEmptyCallback(this.roomId);
  }

  update() {
    const dt = 1.0;
    this.worldState.players.forEach((p) => {
      if (p.isDead) {
        this.handlePlayerDeath(p, null);
      }
    });
    this.playerSystem.update();
    this.enemySystem.update();
    this.itemSystem.update();
    this.physicsSystem.update(this.worldState, dt);

    if (this.worldState.enemies.length < 3) {
      if (Math.random() < 0.02) this.enemySystem.spawnEnemy();
    }
  }

  broadcastGameState() {
    this.networkSystem.broadcastGameState(
      this.worldState.players,
      this.worldState
    );
    this.worldState.frameEvents = [];
  }

  updateChart() {
    const chartDelta = this.tradingSystem.updateChart();
    const msg = JSON.stringify({ type: "chart_update", payload: chartDelta });
    this.worldState.players.forEach((p) => {
      if (p.ws && p.ws.readyState === WebSocket.OPEN) p.ws.send(msg);
    });
  }

  broadcastLeaderboard() {
    const leaderboard = Array.from(this.worldState.players.values())
      .filter((p) => !p.isDead && p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((p) => ({ id: p.id, name: p.name, score: p.score }));

    const msg = JSON.stringify({
      type: "leaderboard_update",
      payload: { leaderboardData: leaderboard },
    });
    this.worldState.players.forEach((p) => {
      if (p.ws && p.ws.readyState === WebSocket.OPEN) p.ws.send(msg);
    });
  }

  addPlayer(userId, playerName, ws, isDebug) {
    if (!this.worldState.isReady) {
      this.warmupSystem.addPendingPlayer(userId, playerName, ws, isDebug);
      return null;
    }

    const joinData = this.joinPlayerToGame(userId, playerName, ws, isDebug);
    if (joinData) {
      try {
        ws.send(JSON.stringify(joinData));
      } catch (e) {}
    }
    return { id: userId, x: 0, y: 0 };
  }

  joinPlayerToGame(userId, playerName, ws, isDebug) {
    if (!this.worldState.isRunning) this.startLoop();

    const existing = this.worldState.players.get(userId);
    if (existing && existing.ws) existing.ws.close(4001);

    const x = Math.random() * (this.worldState.width - 100) + 50;
    const y = Math.random() * (this.worldState.height - 100) + 50;

    const player = new PlayerState(userId, playerName, x, y, ws, isDebug);
    this.worldState.players.set(userId, player);

    this.networkSystem.sendSnapshot(player, this.worldState);

    const staticState = {
      obstacles: this.worldState.obstacles,
      playerSpawns: this.worldState.playerSpawns,
      enemySpawns: this.worldState.enemySpawns,
    };
    ws.send(JSON.stringify({ type: "static_state", payload: staticState }));

    ws.send(
      JSON.stringify({
        type: "chart_state",
        payload: this.tradingSystem.getChartState(),
      })
    );
    return {
      type: "join_success",
      roomId: this.roomId,
      worldConfig: {
        width: this.worldState.width,
        height: this.worldState.height,
      },
    };
  }

  removePlayer(userId) {
    const player = this.worldState.players.get(userId);
    if (player) {
      this.persistenceSystem.saveScore(player.id, player.name, player.score);
      if (player.ws && player.ws.readyState === WebSocket.OPEN) {
        player.ws.close(4000, "Game Over");
      }
      this.worldState.players.delete(userId);
    }
    if (this.worldState.players.size === 0) this.stopLoop();
  }

  addBullet(bullet) {
    bullet.id = `b_${this.worldState.bulletIdCounter++}`;
    this.worldState.bullets.push(bullet);
  }

  handlePlayerInput(userId, input) {
    const player = this.worldState.players.get(userId);
    if (!player) return;

    player.lastInputTime = Date.now();
    
    // 【変更】アクションの実行をディスパッチャーへ委譲
    this.actionDispatcher.dispatch(player, input);
  }

  handlePlayerDeath(player, attackerPlayer) {
    if (
      attackerPlayer &&
      attackerPlayer.id !== player.id &&
      !attackerPlayer.isDead
    ) {
      attackerPlayer.ep += player.ep;
      attackerPlayer.hp = Math.min(100, attackerPlayer.hp + 20);
    }
    this.persistenceSystem.saveScore(player.id, player.name, player.score);
    player.ep = 0;
    setTimeout(() => {
      if (this.worldState.players.has(player.id)) {
        this.removePlayer(player.id);
      }
    }, 0);
  }
}