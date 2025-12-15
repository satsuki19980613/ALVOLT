import { CollisionLogic } from "./CollisionLogic.js";

export const AILogic = {
  /**
   * 索敵範囲内の最も近いプレイヤーを探す
   */
  findClosestPlayer(enemy, players, searchRadius) {
    let closestPlayer = null;
    let minDistance = searchRadius;

    for (const player of players.values()) {
      if (player.isDead) continue;

      const dist = CollisionLogic.getDistance(
        enemy.x,
        enemy.y,
        player.x,
        player.y
      );
      if (dist < minDistance) {
        minDistance = dist;
        closestPlayer = player;
      }
    }
    return closestPlayer;
  },

  /**
   * 敵の移動目標角度を決定する
   */
  decideTargetAngle(enemy, targetPlayer) {
    if (targetPlayer) {
      const dist = CollisionLogic.getDistance(
        enemy.x,
        enemy.y,
        targetPlayer.x,
        targetPlayer.y
      );

      if (dist < 500) {
        return Math.atan2(targetPlayer.y - enemy.y, targetPlayer.x - enemy.x);
      } else {
        return enemy.targetAngle + (Math.random() - 0.5) * 0.5;
      }
    } else {
      return enemy.targetAngle + (Math.random() - 0.5) * 1.0;
    }
  },

  /**
   * 射撃判定とクールダウン時間の決定
   */
  shouldShoot(enemy, targetPlayer, outResult) {
    // 書き込み先の確保（安全策）
    if (!outResult) {
        outResult = { shouldShoot: false, angle: 0, nextCooldown: 60 };
    }

    if (!targetPlayer) {
        outResult.shouldShoot = false;
        outResult.nextCooldown = 60;
        return outResult;
    }

    const dist = CollisionLogic.getDistance(
      enemy.x,
      enemy.y,
      targetPlayer.x,
      targetPlayer.y
    );

    if (dist < 500) {
      const angle = Math.atan2(
        targetPlayer.y - enemy.y,
        targetPlayer.x - enemy.x
      );
      
      // 結果を書き込む
      outResult.shouldShoot = true;
      outResult.angle = angle;
      outResult.nextCooldown = 120;
      return outResult;
    }

    // 結果を書き込む
    outResult.shouldShoot = false;
    outResult.nextCooldown = 60;
    return outResult;
  },
};
