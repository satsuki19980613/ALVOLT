// src/application/services/PlayerActionDispatcher.js

/**
 * プレイヤーの入力アクションを適切なシステムに振り分けるサービス
 */
export class PlayerActionDispatcher {
  /**
   * @param {PlayerSystem} playerSystem 
   * @param {TradingSystem} tradingSystem 
   * @param {ServerGame} game - 死亡処理などでGameインスタンスが必要な場合のため
   */
  constructor(playerSystem, tradingSystem, game) {
    this.playerSystem = playerSystem;
    this.tradingSystem = tradingSystem;
    this.game = game; // handleSettle等でgameへの参照が必要な場合に使用
  }

  /**
   * 入力に基づいてアクションを実行
   * @param {PlayerState} player 
   * @param {Object} input - { states: {}, wasPressed: {}, mouseWorldPos: {x,y} }
   */
  dispatch(player, input) {
    // 継続的な入力状態の更新
    player.inputs = input.states || {};
    
    // シーケンス番号の更新
    if (input.seq) {
      player.lastProcessedInputSeq = input.seq;
    }

    // 単発アクション（wasPressed）の処理
    if (input.wasPressed) {
      // 射撃
      if (input.wasPressed.shoot) {
        this.playerSystem.handleShoot(player, input.mouseWorldPos);
      }

      // トレードエントリー
      if (input.wasPressed.trade_long) {
        this.tradingSystem.handleEntry(player, "long");
      }
      if (input.wasPressed.trade_short) {
        this.tradingSystem.handleEntry(player, "short");
      }
      
      // トレード決済
      if (input.wasPressed.trade_settle) {
        this.tradingSystem.handleSettle(player, this.game);
      }

      // BET操作
      const betActions = ["bet_up", "bet_down", "bet_all", "bet_min"];
      betActions.forEach((action) => {
        if (input.wasPressed[action]) {
          this.tradingSystem.handleBetInput(player, action);
        }
      });
    }
  }
}