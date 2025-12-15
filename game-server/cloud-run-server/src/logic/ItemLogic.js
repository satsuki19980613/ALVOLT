/**
 * アイテムに関する純粋なロジック
 */
export const ItemLogic = {
  /**
   * アイテムを補充すべきか判定
   */
  shouldSpawnItem(currentCount, minCount) {
    return currentCount < minCount;
  },

  /**
   * 補充が必要な数を計算
   */
  calculateSpawnCount(currentCount, maxCount) {
    return Math.max(0, maxCount - currentCount);
  },

  /**
   * ランダムなスポーン位置を計算
   */
  calculateSpawnPosition(worldWidth, worldHeight, margin = 100) {
    const x = Math.random() * (worldWidth - margin * 2) + margin;
    const y = Math.random() * (worldHeight - margin * 2) + margin;
    return { x, y };
  },

  /**
   * EP回復後の値を計算
   * ルール: アイテムによる回復は100を超えない。
   * (敵撃破等のEPは100を超えることができるため、アイテムのみキャップを設ける)
   */
  calculateRecoveredEp(currentEp, recoveryAmount, cap = 100) {
    if (currentEp >= cap) {
      return currentEp; // 既にキャップ以上なら回復しない
    }
    return Math.min(cap, currentEp + recoveryAmount);
  }
};