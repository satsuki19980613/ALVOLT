import { BulletState } from "../../domain/BulletState.js";
import { BulletType } from "../../core/constants/Protocol.js";
import { ItemLogic } from "../../logic/ItemLogic.js";

export class ItemSystem {
  constructor(game) {
    this.game = game;
    this.MIN_ITEMS = 6;
    this.MAX_ITEMS = 10;
    this.RECOVERY_AMOUNT = 10;
  }

  update() {
    this.maintainItemCount();
  }

  maintainItemCount() {
    const worldState = this.game.worldState;
    
    // 現在のアイテム数をカウント
    const currentItems = worldState.bullets.filter(
      (b) => b.type === BulletType.ITEM_EP
    ).length;

    // 補充判定
    if (ItemLogic.shouldSpawnItem(currentItems, this.MIN_ITEMS)) {
      const needed = ItemLogic.calculateSpawnCount(currentItems, this.MAX_ITEMS);
      
      for (let i = 0; i < needed; i++) {
        this.spawnItem(worldState.width, worldState.height);
      }
    }
  }

  spawnItem(width, height) {
    const pos = ItemLogic.calculateSpawnPosition(width, height);
    
    // 弾丸扱いとして生成するが、移動しないオブジェクトとして設定
    const item = new BulletState(
      pos.x,
      pos.y,
      30,                 // 半径
      0,                  // 角度
      0,                  // 速度 (0)
      BulletType.ITEM_EP, // タイプ
      0,                  // ダメージ (0)
      "system"            // 所有者
    );

    this.game.addBullet(item);
  }
}