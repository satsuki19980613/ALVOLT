/**
 * src/logic/CollisionLogic.js
 */
export const CollisionLogic = {
  getDistance(x1, y1, x2, y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  },

  getDistanceSq(x1, y1, x2, y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return dx * dx + dy * dy;
  },

  /**
   * 座標制限 (Step 1で修正済みだが、再掲)
   */
  clampPosition(x, y, radius, worldWidth, worldHeight, outResult) {
    const newX = Math.max(radius, Math.min(worldWidth - radius, x));
    const newY = Math.max(radius, Math.min(worldHeight - radius, y));
    if (outResult) {
      outResult.x = newX;
      outResult.y = newY;
      return outResult;
    }
    return { x: newX, y: newY };
  },

  /**
   * エンティティ間の重なり解消
   * ★修正: outResult に書き込む (戻り値は boolean)
   */
  resolveEntityOverlap(x1, y1, r1, x2, y2, r2, outResult) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    const distSq = dx * dx + dy * dy;
    const totalRadius = r1 + r2;

    if (distSq < totalRadius * totalRadius) {
      const dist = Math.sqrt(distSq);
      const overlap = totalRadius - dist;

      if (overlap > 0) {
        let pushX = 0;
        let pushY = 0;

        if (dist === 0) {
          pushX = 0.1;
          pushY = 0;
        } else {
          pushX = dx / dist;
          pushY = dy / dist;
        }

        const pushAmount = overlap / 2;

        if (outResult) {
          outResult.x = pushX * pushAmount;
          outResult.y = pushY * pushAmount;
        }
        return true;
      }
    }
    return false;
  },

  /**
   * 障害物との衝突解決 (反復計算)
   * ★修正: outResult (最終座標) と tempVector (計算用) を受け取る
   */
  resolveObstacleCollision(
    circleX,
    circleY,
    radius,
    obstacle,
    outResult,
    tempVector
  ) {
    const distX = circleX - obstacle.centerX;
    const distY = circleY - obstacle.centerY;
    const threshold = radius + obstacle.maxColliderRadius + 10;

    if (distX * distX + distY * distY > threshold * threshold) {
      return false;
    }

    let tempX = circleX;
    let tempY = circleY;
    let hasCollision = false;
    const ITERATIONS = 4;

    for (let i = 0; i < ITERATIONS; i++) {
      let movedInThisLoop = false;
      for (const c of obstacle.colliders) {
        const hit = this.solveSingleCollider(
          tempX,
          tempY,
          radius,
          obstacle.centerX,
          obstacle.centerY,
          c,
          tempVector
        );

        if (hit) {
          hasCollision = true;
          movedInThisLoop = true;
          tempX += tempVector.x;
          tempY += tempVector.y;
        }
      }
      if (!movedInThisLoop) break;
    }

    if (hasCollision) {
      if (outResult) {
        outResult.x = tempX;
        outResult.y = tempY;
      }
      return true;
    }
    return false;
  },

  /**
   * 単一コライダーとの判定
   * ★修正: outVector に押し出し量を書き込む
   */
  solveSingleCollider(
    circleX,
    circleY,
    radius,
    obsCenterX,
    obsCenterY,
    collider,
    outVector
  ) {
    const boxCenterX = obsCenterX + (collider.x || 0);
    const boxCenterY = obsCenterY + (collider.y || 0);

    const dx = circleX - boxCenterX;
    const dy = circleY - boxCenterY;
    const totalAngle = (collider.angle || 0) * (Math.PI / 180);

    const cos = Math.cos(-totalAngle);
    const sin = Math.sin(-totalAngle);

    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    const halfW = collider.w / 2;
    const halfH = collider.h / 2;

    const closestLocX = Math.max(-halfW, Math.min(localX, halfW));
    const closestLocY = Math.max(-halfH, Math.min(localY, halfH));

    const distLocX = localX - closestLocX;
    const distLocY = localY - closestLocY;

    const distSq = distLocX * distLocX + distLocY * distLocY;

    if (distSq > radius * radius || distSq === 0) {
      return false;
    }

    const dist = Math.sqrt(distSq);
    const overlap = radius - dist;

    let pushLocX = 0;
    let pushLocY = 0;

    if (dist > 0) {
      pushLocX = (distLocX / dist) * overlap;
      pushLocY = (distLocY / dist) * overlap;
    }

    const cosR = Math.cos(totalAngle);
    const sinR = Math.sin(totalAngle);

    if (outVector) {
      outVector.x = pushLocX * cosR - pushLocY * sinR;
      outVector.y = pushLocX * sinR + pushLocY * cosR;
    }
    return true;
  },
};
