/**
 * チャート計算、価格変動、トレード損益計算に関する純粋ロジック
 */
export const TradeLogic = {
  /**
   * 次の価格をランダムに計算する
   */
  calculateNextPrice(currentPrice) {
    let change;
    if (Math.random() < 0.005) {
      change = (Math.random() - 0.5) * 18;
    } else {
      const r = Math.random();
      if (r < 0.6) {
        change = (Math.random() - 0.5) * 0.23;
      } else if (r < 0.8) {
        change = (Math.random() - 0.5) * 0.6;
      } else {
        change = (Math.random() - 0.5) * 2;
      }
    }

    let nextPrice = currentPrice + change;
    if (nextPrice < 200) nextPrice = 200;
    if (nextPrice > 5000) nextPrice = 5000;
    
    return nextPrice;
  },

  /**
   * 移動平均(MA)を計算する
   */
  calculateMA(chartData, period) {
    if (chartData.length < period) return null;
    
    let sum = 0;
    const currentIndex = chartData.length - 1;
    for (let j = 0; j < period; j++) {
      sum += chartData[currentIndex - j];
    }
    return sum / period;
  },

  /**
   * 決済時の損益を計算する
   */
  calculateProfit(entryPrice, currentPrice, amount, type) {
    let priceDiff;
    if (type === "short") {
      priceDiff = entryPrice - currentPrice;
    } else {
      priceDiff = currentPrice - entryPrice;
    }

    const powerValue = priceDiff * amount;
    let intPowerValue;
    
    if (powerValue > 0) {
      intPowerValue = Math.ceil(powerValue);
    } else {
      intPowerValue = Math.floor(powerValue);
    }
    
    return intPowerValue;
  },

  /**
   * BET額の調整計算
   */
  adjustBetAmount(currentAmount, playerEp, action, minBet) {
    let newAmount = currentAmount;
    if (action === "bet_up") {
      newAmount = Math.min(playerEp, currentAmount + 10);
    } else if (action === "bet_down") {
      newAmount = Math.max(minBet, currentAmount - 10);
    } else if (action === "bet_all") {
      newAmount = Math.max(minBet, playerEp);
    } else if (action === "bet_min") {
      newAmount = minBet;
    }
    return newAmount;
  }
};