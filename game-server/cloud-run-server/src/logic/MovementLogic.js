/**
 * 移動ベクトル計算や座標更新に関する純粋ロジック
 */
export const MovementLogic = {
  /**
   * 入力状態に基づいてプレイヤーの速度と角度を計算する
   */
  calculatePlayerVelocity(inputs, speed) {
    let dx = 0;
    let dy = 0;

    if (inputs["move_up"]) dy -= 1;
    if (inputs["move_down"]) dy += 1;
    if (inputs["move_left"]) dx -= 1;
    if (inputs["move_right"]) dx += 1;

    let vx = 0;
    let vy = 0;
    let angle = null;

    if (dx !== 0 || dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;

      vx = dx * speed;
      vy = dy * speed;
      angle = Math.atan2(dy, dx);
    }

    return { vx, vy, angle };
  },

  /**
   * 速度ベクトルに基づいて座標を更新する (単純移動)
   * ★修正: 新しいオブジェクトを返さず、outResultに書き込む
   * @param {number} x
   * @param {number} y
   * @param {number} vx
   * @param {number} vy
   * @param {object} outResult - 結果を格納する再利用可能なオブジェクト {x, y}
   */
  updatePosition(x, y, vx, vy, outResult) {
    if (!outResult) {
        // 安全策: もし渡されなかったら仕方なく作るが、基本は渡すこと
        return { x: x + vx, y: y + vy };
    }
    outResult.x = x + vx;
    outResult.y = y + vy;
    return outResult; // 参照を返す（連鎖呼び出し用）
  },

  /**
   * 角度と速度から速度成分を計算する
   */
  calculateVelocityFromAngle(angle, speed) {
    return {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed
    };
  }
};