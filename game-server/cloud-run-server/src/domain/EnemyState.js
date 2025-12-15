import { BaseState } from "./BaseState.js";

/**
 * 敵固有の状態データ定義
 */
export class EnemyState extends BaseState {
  constructor(x, y, worldWidth, worldHeight) {
    super(x, y, 45, "enemy");
    this.id = null; 
    this.hp = 50;
    this.speed = 1.5;
    this.shootCooldown = Math.random() * 100 + 100;
    this.targetAngle = Math.random() * Math.PI * 2;
    this.moveTimer = 0;
    
    this.vx = 0;
    this.vy = 0;
    
    this.WORLD_WIDTH = worldWidth;
    this.WORLD_HEIGHT = worldHeight;
  }
}