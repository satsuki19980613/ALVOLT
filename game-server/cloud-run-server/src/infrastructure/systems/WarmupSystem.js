/**
 * src/infrastructure/systems/WarmupSystem.js
 */
export class WarmupSystem {
  constructor(game) {
    this.game = game;
    this.isWarmingUp = false;
    this.pendingConnections = [];
  }

  async start() {
    console.log(`[Warmup] Room ${this.game.roomId}: 初期化を開始します...`);
    this.isWarmingUp = true;

    this.game.initWorld();

    await new Promise((resolve) => setTimeout(resolve, 200));

    console.log(`[Warmup] 初期化完了。プレイヤーの入室を許可します。`);

    this.isWarmingUp = false;

    this.game.worldState.isReady = true;

    this.processPendingConnections();
  }

  addPendingPlayer(userId, playerName, ws, isDebug) {
    console.log(
      `[Warmup] 準備中のためプレイヤー ${playerName} (ID: ${userId}) を待機させます。`
    );
    this.pendingConnections.push({ userId, playerName, ws, isDebug });
  }

  processPendingConnections() {
    if (this.pendingConnections.length === 0) return;
    console.log(
      `[Warmup] 待機中の ${this.pendingConnections.length} 名を参加処理します。`
    );

    this.pendingConnections.forEach(({ userId, playerName, ws, isDebug }) => {
      if (ws.readyState === ws.OPEN) {
        const joinData = this.game.joinPlayerToGame(
          userId,
          playerName,
          ws,
          isDebug
        );

        if (joinData) {
          try {
            ws.send(JSON.stringify(joinData));
          } catch (e) {
            console.error("[Warmup] Failed to send join_success:", e);
          }
        }
      }
    });
    this.pendingConnections = [];

    if (
      !this.game.worldState.isRunning &&
      this.game.worldState.players.size > 0
    ) {
      this.game.startLoop();
    }
  }
}
