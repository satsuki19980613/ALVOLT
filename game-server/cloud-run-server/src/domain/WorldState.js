/**
 * ゲームワールド全体の状態を管理するコンテナ
 */
export class WorldState {
  constructor() {
    this.players = new Map();
    this.enemies = [];
    this.bullets = [];
    this.obstacles = [];
    this.frameEvents = [];
    
    this.playerSpawns = [];
    this.enemySpawns = [];
    
    this.enemyIdCounter = 0;
    this.bulletIdCounter = 0;
    
    this.tickTimes = [];
    this.avgTickTime = 0;
    this.debugPlayerCount = 0;
    
    this.isRunning = false;
    this.isReady = false;
  }
}