/**
 * プレイヤーの描画用データモデル
 */
export class VisualPlayer {
  constructor(id, x, y, color = "#00bcd4") {
    this.id = id;
    this.x = x;
    this.y = y;
    this.radius = 45;
    this.color = color;
    
    this.targetX = x;
    this.targetY = y;
    
    this.rotationAngle = 0;
    this.aimAngle = 0;
    this.targetAimAngle = 0;
    
    this.hp = 100;
    this.ep = 100;
    this.name = "";
    this.isDead = false;
    this.isMe = false;
    
    this.chargeBetAmount = 10;
    this.chargePosition = null;
    this.stockedBullets = [];
    this.maxStock = 10;
    
    this.hoverOffset = 0;
    this.isInitialized = false;
  }
}