import { BaseState } from "./BaseState.js";

/**
 * 弾固有の状態データ定義
 */
export class BulletState extends BaseState {
  constructor(x, y, radius, angle, speed, type, damage, ownerId) {
    super(x, y, radius, type);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.damage = damage;
    this.ownerId = ownerId;
    this.id = null; 
  }
}