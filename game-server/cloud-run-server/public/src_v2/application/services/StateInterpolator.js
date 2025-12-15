// src_v2/application/services/StateInterpolator.js
import { InterpolationLogic } from "../../logic/InterpolationLogic.js";

/**
 * ゲーム状態の補間計算を行うサービス
 */
export class StateInterpolator {
  constructor() {}

  /**
   * 現在のVisualStateに対して補間計算を行い、座標を更新する
   * @param {Object} visualState - players, enemies, bullets, effects を持つ状態オブジェクト
   * @param {number} dt - デルタフレーム
   */
  update(visualState, dt) {
    if (!visualState) return;

    // プレイヤーの補間
    visualState.players.forEach((p) => {
      p.x = InterpolationLogic.calculateNextPosition(p.x, p.targetX, dt);
      p.y = InterpolationLogic.calculateNextPosition(p.y, p.targetY, dt);

      p.rotationAngle = InterpolationLogic.calculateNextAngle(
        p.rotationAngle,
        p.targetAimAngle,
        dt
      );

      p.aimAngle = InterpolationLogic.calculateNextAngle(
        p.aimAngle,
        p.targetTurretAngle,
        dt
      );
    });

    // 敵の補間
    visualState.enemies.forEach((e) => {
      e.x = InterpolationLogic.calculateNextPosition(e.x, e.targetX || e.x, dt);
      e.y = InterpolationLogic.calculateNextPosition(e.y, e.targetY || e.y, dt);
    });

    // 弾の補間
    visualState.bullets.forEach((b) => {
      b.x = InterpolationLogic.calculateNextPosition(b.x, b.targetX || b.x, dt);
      b.y = InterpolationLogic.calculateNextPosition(b.y, b.targetY || b.y, dt);
    });

    // エフェクトの更新
    for (let i = visualState.effects.length - 1; i >= 0; i--) {
      const ef = visualState.effects[i];
      // エフェクト自体がupdateメソッドを持っている前提
      if (ef && typeof ef.update === "function") {
        ef.update(dt);
        if (ef.isDead && typeof ef.isDead === "function" && ef.isDead()) {
          visualState.effects.splice(i, 1);
        }
      }
    }
  }
}