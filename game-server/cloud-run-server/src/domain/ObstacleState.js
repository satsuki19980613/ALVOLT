import { BaseState } from "./BaseState.js";

/**
 * 障害物固有の状態データ定義
 */
export class ObstacleState extends BaseState {
  constructor(x, y, width, height, type, borderRadius, individualRadii, rotation, className) {
    super(x, y, Math.max(width, height), type);
    this.width = width;
    this.height = height;
    this.className = className;
    this.rotation = (rotation || 0) * (Math.PI / 180);
    this.centerX = x + width / 2;
    this.centerY = y + height / 2;
    this.colliders = [];
    this.maxColliderRadius = Math.max(width, height) / 2;
    
    if (this.colliders.length === 0) {
      this.colliders.push({
        type: "rect",
        x: 0,
        y: 0,
        w: width,
        h: height,
        angle: 0,
      });
    }
  }
}