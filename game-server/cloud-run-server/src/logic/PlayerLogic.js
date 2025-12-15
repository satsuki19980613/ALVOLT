export const PlayerLogic = {
  /**
   * 旋回と慣性移動の計算（常時前進）
   * @param {Object} inputs 入力
   * @param {number} speed 基本速度
   * @param {number} currentAngle 現在の角度
   * @param {number} currentVx 現在の速度X
   * @param {number} currentVy 現在の速度Y
   * @param {Object} outResult 結果格納用
   */
  calculateVelocity(inputs, speed, currentAngle, currentVx, currentVy, outResult) {
    // パラメータ調整（お好みで調整してください）
    const ROTATION_SPEED = 0.035; // 値を小さくすると、旋回がゆったりになります
    const INERTIA = 0.04       // 慣性係数（小さいほどツルツル滑る）

    let nextAngle = currentAngle || 0;

    // 左右入力で「角度」を変える
    if (inputs.move_left) nextAngle -= ROTATION_SPEED;
    if (inputs.move_right) nextAngle += ROTATION_SPEED;

    // 常に「向いている方向」へ最高速で進もうとする力
    const targetVx = Math.cos(nextAngle) * speed;
    const targetVy = Math.sin(nextAngle) * speed;

    // 現在の速度と目標速度を混ぜる（慣性）
    const nextVx = currentVx + (targetVx - currentVx) * INERTIA;
    const nextVy = currentVy + (targetVy - currentVy) * INERTIA;

    if (!outResult) {
      outResult = { vx: 0, vy: 0, angle: 0 };
    }

    outResult.vx = nextVx;
    outResult.vy = nextVy;
    outResult.angle = nextAngle;

    return outResult;
  },

  /**
   * オートエイム: 最も近いターゲットを探して角度を返す
   * @param {Object} player
   * @param {Set|Array} nearbyEntities
   * @param {number} searchRadius
   */
  calculateAutoAimAngle(player, nearbyEntities, searchRadius = 750) {
    let closestTarget = null;
    let minDistSq = searchRadius * searchRadius;

    for (const entity of nearbyEntities) {
      if (entity.id === player.id) continue;

      if ((entity.hp !== undefined && entity.hp <= 0) || entity.isDead)
        continue;

      if (entity.type === "enemy" || entity.type === "player") {
        const dx = entity.x - player.x;
        const dy = entity.y - player.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < minDistSq) {
          minDistSq = distSq;
          closestTarget = entity;
        }
      }
    }

    if (closestTarget) {
      return Math.atan2(closestTarget.y - player.y, closestTarget.x - player.x);
    }

    return null;
  },

  /**
   * 弾の種類に応じたパラメータを取得
   */
  getBulletParams(type) {
    let speed = 9;
    let radius = 6;

    if (type === "player_special_2") {
      speed = 10;
      radius = 12;
    } else if (type === "player_special_3") {
      speed = 11;
      radius = 30;
    } else if (type === "player_special_4") {
      speed = 24;
      radius = 45;
    }

    return { speed, radius };
  },
};
