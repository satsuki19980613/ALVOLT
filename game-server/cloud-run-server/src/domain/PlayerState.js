import { BaseState } from "./BaseState.js";

/**
 * プレイヤー固有の状態データ定義
 */
export class PlayerState extends BaseState {
  constructor(id, name, x, y, ws, isDebug = false) {
    super(x, y, 45, "player");
    this.id = id; 
    this.name = name;
    this.ws = ws;
    this.isDebugPlayer = isDebug;
    this.angle = 0;      
    this.aimAngle = 0
    this.vx = 0;
    this.vy = 0;
    this.score = 0;
    this.hp = 100;
    this.ep = 100;
    this.angle = 0;
    this.defaultSpeed = 5;
    this.speed = this.defaultSpeed;
    this.shootCooldown = 0;
    this.isDead = false;
    this.chargeBetAmount = 10;
    this.chargePosition = null;
    this.stockedBullets = [];
    this.maxStock = 10;
    this.inputs = {};
    this.inputPressed = {};
    this.lastInputTime = Date.now();
    this.isPaused = false;
    this.isIdleWarned = false;
    this.deathCleanupTimer = null;
    this.lastProcessedInputSeq = 0;
    this.lastBroadcastState = {
      players: new Map(),
      enemies: new Map(),
      bullets: new Map(),
    };
  }
}