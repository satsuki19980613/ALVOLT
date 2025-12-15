import { TradeLogic } from "../../logic/TradeLogic.js";
import { BulletType } from "../../core/constants/Protocol.js";

export class TradingSystem {
  constructor() {
    this.MIN_BET = 10;
    this.MAX_CHART_POINTS = 300;
    this.MA_PERIODS = { short: 20, medium: 50, long: 100 };

    this.state = {
      chartData: [],
      maData: { short: [], medium: [], long: [] },
      currentPrice: 800,
      minPrice: 1000,
      maxPrice: 1000,
    };
  }

  init() {
    this.state.chartData = [];
    this.state.currentPrice = 800;
    this.state.maData = { short: [], medium: [], long: [] };

    for (let i = 0; i < this.MAX_CHART_POINTS; i++) {
      this.updatePrice();
      this.state.chartData.push(this.state.currentPrice);
      this.calculateLatestMA();
    }
    this.calculateMinMax();
  }

  updateChart() {
    this.updatePrice();
    this.state.chartData.push(this.state.currentPrice);

    if (this.state.chartData.length > this.MAX_CHART_POINTS) {
      this.state.chartData.shift();
    }

    this.calculateLatestMA();
    this.calculateMinMax();

    return {
      currentPrice: this.state.currentPrice,
      minPrice: this.state.minPrice,
      maxPrice: this.state.maxPrice,
      newChartPoint: this.state.chartData[this.state.chartData.length - 1],
      newMaPoint: {
        short: this.state.maData.short[this.state.maData.short.length - 1],
        medium: this.state.maData.medium[this.state.maData.medium.length - 1],
        long: this.state.maData.long[this.state.maData.long.length - 1],
      },
    };
  }

  updatePrice() {
    this.state.currentPrice = TradeLogic.calculateNextPrice(
      this.state.currentPrice
    );
  }

  calculateLatestMA() {
    const types = ["short", "medium", "long"];
    const currentIndex = this.state.chartData.length - 1;

    types.forEach((type) => {
      const period = this.MA_PERIODS[type];
      let val = null;

      if (this.state.chartData.length >= period) {
        val = TradeLogic.calculateMA(this.state.chartData, period);
      }

      this.state.maData[type].push(val);

      if (this.state.maData[type].length > this.MAX_CHART_POINTS) {
        this.state.maData[type].shift();
      }
    });
  }

  calculateMinMax() {
    if (this.state.chartData.length < 1) return;

    this.state.minPrice = Math.min(...this.state.chartData);
    this.state.maxPrice = Math.max(...this.state.chartData);
  }

  handleBetInput(player, action) {
    if (player.chargePosition) return;

    player.chargeBetAmount = TradeLogic.adjustBetAmount(
      player.chargeBetAmount,
      player.ep,
      action,
      this.MIN_BET
    );
  }

  handleEntry(player, type) {
    if (player.isDead || player.chargePosition) return;

    if (
      player.ep >= player.chargeBetAmount &&
      player.chargeBetAmount >= this.MIN_BET
    ) {
      player.chargePosition = {
        entryPrice: this.state.currentPrice,
        amount: player.chargeBetAmount,
        type: type,
      };
      player.ep -= player.chargeBetAmount;
      player.isDirty = true;
    }
  }

  handleSettle(player, game) {
    if (player.isDead || !player.chargePosition) return;

    const profit = TradeLogic.calculateProfit(
      player.chargePosition.entryPrice,
      this.state.currentPrice,
      player.chargePosition.amount,
      player.chargePosition.type
    );
    player.chargePosition = null;

    if (profit > 0) {
      let typeId = BulletType.ORB;

      if (profit >= 100) {
        typeId = BulletType.FIREBALL;
      } else if (profit >= 50) {
        typeId = BulletType.SLASH;
      }

      if (player.stockedBullets.length < player.maxStock) {
        player.stockedBullets.push({ damage: profit, type: typeId });
      }
    } else {
      const damage = Math.abs(profit);
      player.hp -= damage;
      if (player.hp <= 0) {
        player.isDead = true;
        if (game && typeof game.handlePlayerDeath === "function") {
          game.handlePlayerDeath(player, null);
        }
      }
    }

    player.chargeBetAmount = Math.min(player.ep, this.MIN_BET);
    if (player.chargeBetAmount < this.MIN_BET)
      player.chargeBetAmount = this.MIN_BET;

    player.isDirty = true;
  }

  getChartState() {
    return this.state;
  }
}
