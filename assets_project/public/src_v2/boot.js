// src_v2/boot.js
import { ClientGame } from "./application/ClientGame.js";
import { AppFlowManager } from "./application/managers/AppFlowManager.js";
import { AccountManager } from "./application/managers/AccountManager.js"; // 追加
import { DomManipulator } from "./infrastructure/ui/DomManipulator.js";
import { AssetLoader } from "./infrastructure/assets/AssetLoader.js";
import { EffectConfig } from "./core/config/EffectConfig.js";
import { FirebaseAuthAdapter } from "./infrastructure/auth/FirebaseAuthAdapter.js"; // 追加

window.addEventListener("load", async () => {
  console.log("[Boot] Starting System...");

  // 1. UI基盤の初期化
  const ui = new DomManipulator();
  
  // 2. 認証基盤の初期化
  const authAdapter = new FirebaseAuthAdapter();
  const accountManager = new AccountManager(authAdapter);

  // 3. ゲームとフローの初期化
  const game = new ClientGame(ui);
  // AppFlowManagerにAccountManagerを渡して連携させる
  const appFlow = new AppFlowManager(ui, game, accountManager); 

  // 4. アセットロード
  ui.setLoadingText("Loading Assets...");
  ui.showScreen("loading");
  
  const assetLoader = new AssetLoader();
  await assetLoader.loadSpriteAssets(EffectConfig);

  // 5. アカウント状態の監視開始
  // アカウント状態が確定してから画面遷移を行う
  accountManager.init((userEntity) => {
    // ユーザー状態が変わったときの通知をAppFlowManagerに流す
    appFlow.handleUserUpdate(userEntity);
  });

  // 6. ゲーム初期化
  await game.init();
  window.gameInput = game.inputManager;

  console.log("[Boot] Initialization Complete.");
});