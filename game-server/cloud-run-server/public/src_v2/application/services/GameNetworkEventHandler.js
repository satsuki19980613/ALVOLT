// src_v2/application/services/GameNetworkEventHandler.js

/**
 * ネットワークイベントの受信とゲーム状態への反映を担当するハンドラー
 */
export class GameNetworkEventHandler {
  /**
   * @param {ClientGame} game - ゲームのメインコントローラー
   */
  constructor(game) {
    this.game = game;
  }

  /**
   * ネットワーククライアントにイベントリスナーを登録する
   */
  setup() {
    const network = this.game.network;
    const ui = this.game.uiManipulator;

    // ゲーム状態のスナップショット適用
    network.on("game_state_snapshot", (payload) => {
      if (this.game.syncManager) {
        this.game.syncManager.applySnapshot(payload);
      }
    });

    // 差分更新の適用
    network.on("game_state_delta", (payload) => {
      if (this.game.syncManager) {
        this.game.syncManager.applyDelta(payload);
      }
    });

    // 静的情報の受信（マップ設定など）
    network.on("static_state", (payload) => {
      if (this.game.syncManager) {
        this.game.syncManager.setStaticState(payload);
      }
      if (payload.worldConfig) {
        this.game.renderer.setupBackground(
          payload.worldConfig.width,
          payload.worldConfig.height
        );
      }
    });

    // チャート初期状態
    network.on("chart_state", (payload) => {
      this.updateTradeStateFull(payload);
    });

    // チャート更新
    network.on("chart_update", (payload) => {
      this.updateTradeStateDelta(payload);
    });

    // リーダーボードとサーバ統計更新
    network.on("leaderboard_update", (payload) => {
      if (payload.leaderboardData) {
        ui.updateLeaderboard(payload.leaderboardData, this.game.userId);
      }
      if (payload.serverStats) {
        this.game.serverStats = payload.serverStats;
      }
    });

    // 切断時処理
    network.on("disconnect", () => {
      this.game.stopLoop();
      ui.showGameOverScreen(0);
      ui.setLoadingText("Disconnected");
    });
  }

  /**
   * チャート情報の完全更新（ClientGameから移動）
   */
  updateTradeStateFull(payload) {
    this.game.tradeState = payload;
  }

  /**
   * チャート情報の差分更新（ClientGameから移動）
   */
  updateTradeStateDelta(payload) {
    const tradeState = this.game.tradeState;
    if (!tradeState) return;

    tradeState.currentPrice = payload.currentPrice;
    tradeState.minPrice = payload.minPrice;
    tradeState.maxPrice = payload.maxPrice;

    if (payload.newChartPoint) {
      tradeState.chartData.push(payload.newChartPoint);
      if (tradeState.chartData.length > 300) {
        tradeState.chartData.shift();
      }
    }
    if (payload.newMaPoint) {
      ["short", "medium", "long"].forEach((t) => {
        if (!tradeState.maData[t]) tradeState.maData[t] = [];
        tradeState.maData[t].push(payload.newMaPoint[t]);
        if (tradeState.maData[t].length > 300) {
          tradeState.maData[t].shift();
        }
      });
    }
  }
}