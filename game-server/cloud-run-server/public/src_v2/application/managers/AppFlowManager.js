import { AssetLoader } from "../../infrastructure/assets/AssetLoader.js";
import { AudioManager } from "../../infrastructure/audio/AudioManager.js";
import { AudioConfig } from "../../core/config/AudioConfig.js";

export class AppFlowManager {
  constructor(uiManipulator, gameApp, accountManager) {
    this.ui = uiManipulator;
    this.game = gameApp;
    this.accountManager = accountManager;

    // 【変更】DOM操作を担当するサブマネージャーを取得
    // ※DomManipulator側で getMenuManager() を実装する必要があります
    this.menuUi = this.ui.getMenuManager(); 

    this.isDebug = this.ui.isDebugMode || false;
    this.assetLoader = new AssetLoader();
    this.audioManager = new AudioManager();
    this.isAudioLoaded = false;
    this.isAudioLoading = false;
    this.pendingGameStartName = null;

    this.audioManager.onTrackChanged = (title) => {
      this.ui.showMusicNotification(title);
    };

    this.ui.setMenuActionCallback((actionId) => {
      this.handleMenuAction(actionId);
    });
    
    // イベント設定はUIマネージャーへ委譲
    this.setupModalEvents();
    this.setupUI();
  }

  setupModalEvents() {
    // 登録モーダルのイベント設定を委譲
    this.menuUi.setupRegisterEvents(
      (name) => { // onRegister
        if (name) this.executeRegistration(name);
      },
      () => this.ui.closeAllModals() // onClose
    );

    // 引継ぎモーダルのイベント設定を委譲
    this.menuUi.setupTransferEvents({
      onIssue: async () => {
        const currentUser = this.accountManager.currentUser;
        if (!currentUser || currentUser.isGuest) {
          console.warn(
            "[Security] Guest/Unauthorized user cannot issue transfer code."
          );
          return;
        }

        try {
          // ボタンの表示更新を依頼
          this.menuUi.updateIssueButtonState("issuing");

          const code = await this.accountManager.issueCode();

          // 結果表示を依頼
          this.menuUi.displayTransferCode(code);
          this.menuUi.updateIssueButtonState("issued");

          setTimeout(() => {
            this.menuUi.updateIssueButtonState("reset");
          }, 3000);
        } catch (e) {
          console.error(e);
          this.menuUi.displayTransferCode("ERROR");
          this.menuUi.updateIssueButtonState("error");
        }
      },
      onRecover: async (code) => {
        if (!code) return;

        try {
          this.ui.setLoadingText("Recovering Data...");
          this.ui.showScreen("loading");
          this.ui.closeAllModals();

          await this.accountManager.recover(code);

          this.ui.setLoadingText("Success! Reloading...");
          setTimeout(() => {
            location.reload();
          }, 1500);
        } catch (e) {
          console.error(e);
          this.ui.showErrorScreen("Recovery Failed", e);
          setTimeout(() => this.ui.showScreen("home"), 3000);
        }
      },
      onClose: () => this.ui.closeAllModals()
    });
  }

  handleUserUpdate(userEntity) {
    console.log("[AppFlow] User State Updated:", userEntity);
    if (!userEntity) {
      this.ui.setBodyMode("initial");
      this.ui.switchCanvasScene("initial");
    } else {
      this.ui.setBodyMode(userEntity.isGuest ? "guest" : "member");
      this.ui.switchCanvasScene("home", userEntity);
    }
  }

  handleMenuAction(actionId) {
    console.log("[AppFlow] Action:", actionId);
    switch (actionId) {
      case "start_guest":
        this.ui.setLoadingText("Logging in as Guest...");
        this.ui.showScreen("loading");
        this.accountManager.loginGuest().catch((e) => {
          console.error(e);
          this.ui.showErrorScreen("Guest Login Failed", e);
          this.ui.showScreen("home");
        });
        break;

      case "open_ranking":
        this.ui.showScreen("ranking");
        break;

      case "start_register":
      case "open_register":
        this.ui.openModal("register");
        break;

      case "open_transfer":
        this.ui.openModal("transfer");
        break;

      case "toggle_bgm":
        this.handleAudioToggle();
        break;

      case "game_start":
        this.ui.tryFullscreen();
        const currentUser = this.accountManager.currentUser;
        const playerName = currentUser ? currentUser.name : "Guest";

        if (
          this.ui.uiRenderer &&
          typeof this.ui.uiRenderer.startWarp === "function"
        ) {
          this.ui.uiRenderer.startWarp(() => {
            if (this.handleStartGame) {
              this.handleStartGame(playerName);
            } else {
              console.error("Game Start Logic not found.");
            }
          });
        } else {
          if (this.handleStartGame) {
            this.handleStartGame(playerName);
          }
        }
        break;

      case "menu_delete":
        if (
          confirm("WARNING: Account will be deleted permanently. Continue?")
        ) {
          this.ui.setLoadingText("Deleting Account...");
          this.ui.showScreen("loading");

          this.accountManager.deleteUser().catch((e) => {
            console.error(e);
            this.ui.showErrorScreen("Delete Failed. Please re-login.", e);
            this.ui.showScreen("home");
          });
        }
        break;

      default:
        console.warn("Unknown Action:", actionId);
        break;
    }
  }

  executeRegistration(name) {
    if (!name) return;

    this.ui.setLoadingText("Registering...");
    this.ui.showScreen("loading");

    this.ui.closeAllModals();
    this.accountManager
      .registerPlayerName(name)
      .then(() => {
        console.log("Registered successfully.");
      })
      .catch((e) => {
        console.error(e);
        this.ui.showErrorScreen("Registration Failed", e);
      });
  }

  setupUI() {
    // 汎用UIイベントの設定も委譲
    this.menuUi.setupGeneralUiEvents({
        onStart: () => {
            this.ui.tryFullscreen();
            this.handleStartGame();
        },
        onAudioToggle: () => this.handleAudioToggle(),
        onRetry: () => {
            this.ui.tryFullscreen();
            this.handleStartGame("Guest");
        },
        onRetire: () => this.handleRetire(),
        onHome: () => this.handleBackToHome()
    });

    this.ui.mobileControlManager.init();
  }

  handleRetire() {
    if (confirm("ゲームを終了してホームに戻りますか？")) {
      this.game.stopLoop();
      if (this.game.network) {
        this.game.network.disconnect();
      }

      this.ui.showScreen("home");
      // 背景動画の制御もUIマネージャー経由へ
      this.menuUi.setBgVideoVisible(true);
    }
  }

  handleBackToHome() {
    this.ui.showScreen("home");
    this.menuUi.setBgVideoVisible(true);
  }

  async handleStartGame(playerName) {
    const currentUser = this.accountManager.currentUser;
    const uid = currentUser
      ? currentUser.uid
      : "guest_" + Math.random().toString(36).substr(2, 9);

    const name = playerName || (currentUser ? currentUser.name : "Guest");

    if (this.isAudioLoading) {
      this.pendingGameStartName = name;
      this.ui.showScreen("loading");
      this.ui.setLoadingText("音楽データを準備中...");
      return;
    }

    this.ui.showScreen("loading");
    this.ui.setLoadingText("Connecting...");

    try {
      await this.game.connect(uid, name, this.isDebug);

      this.ui.showScreen("game");
      this.game.startLoop();
    } catch (e) {
      console.error(e);
      this.ui.showErrorScreen("接続失敗", e);
    }
  }

  async handleAudioToggle() {
    if (this.isAudioLoading) return;
    if (!this.isAudioLoaded) {
      await this.startLoadingSequence();
      return;
    }

    const isUnmuted = this.audioManager.toggleMute();
    this.ui.updateAudioButton(!isUnmuted);
  }

  async startLoadingSequence() {
    this.isAudioLoading = true;
    this.ui.setAudioLoadingState(true);
    await this.assetLoader.loadAudioPlaylist(
      AudioConfig.BGM_PLAYLIST,
      (percent) => this.ui.updateAudioLoadingProgress(percent)
    );
    console.log("[Audio] Ready to stream (Cached in Memory).");
    this.isAudioLoaded = true;
    this.isAudioLoading = false;
    setTimeout(() => {
      this.ui.setAudioLoadingState(false);
    }, 500);

    const isUnmuted = this.audioManager.toggleMute();
    this.ui.updateAudioButton(!isUnmuted);
    if (this.pendingGameStartName) {
      this.ui.setLoadingText("音楽の準備完了。接続中...");
      this.handleStartGame(this.pendingGameStartName);
      this.pendingGameStartName = null;
    }
  }
}