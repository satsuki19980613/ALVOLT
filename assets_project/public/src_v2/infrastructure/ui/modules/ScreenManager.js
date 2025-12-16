export class ScreenManager {
  constructor(uiRenderer, mobileControlManager) {
    this.uiRenderer = uiRenderer;
    this.mobileControlManager = mobileControlManager;

    this.screens = {
      home: document.getElementById("screen-home"),
      loading: document.getElementById("screen-loading"),
      game: document.getElementById("screen-game"),
      gameover: document.getElementById("screen-gameover"),
      error: document.getElementById("screen-error"),
      ranking: document.getElementById("screen-ranking"),
    };

    this.loadingTextEl = document.getElementById("loading-text");
    this.gameoverScoreEl = document.getElementById("gameover-score");
    this.gameoverMessageEl = document.getElementById("gameover-message");
    this.errorMessageEl = document.getElementById("error-message");

    const btnRankingBack = document.getElementById("btn-ranking-back");
    if (btnRankingBack) {
      btnRankingBack.onclick = () => this.show("home");
    }
  }

  show(screenId) {
    for (const key in this.screens) {
      if (this.screens[key]) this.screens[key].classList.remove("active");
    }

    const s = this.screens[screenId];
    if (s) s.classList.add("active");

    if (screenId === "game") {
      this.uiRenderer.stop();
    } else {
      this.uiRenderer.start();
    }

    if (this.mobileControlManager) {
      this.mobileControlManager.applyScreenMode(screenId);
    }
  }

  setBodyMode(mode) {
    document.body.classList.remove("mode-initial", "mode-guest", "mode-member");
    document.body.classList.add(`mode-${mode}`);
    this.show("home");
  }

  setLoadingText(text) {
    if (this.loadingTextEl) this.loadingTextEl.textContent = text;
  }

  showGameOver(score) {
    if (this.gameoverScoreEl)
      this.gameoverScoreEl.textContent = Math.round(score);
    if (this.gameoverMessageEl)
      this.gameoverMessageEl.textContent = "スコアを保存中...";
    this.show("gameover");
  }

  showError(message, error) {
    console.error(message, error);
    if (this.errorMessageEl) {
      this.errorMessageEl.textContent = `${message} (${
        error.code || error.message
      })`;
    }
    this.show("error");
  }

  setMobileControlManager(manager) {
    this.mobileControlManager = manager;
  }
}
