export class MenuUiManager {
  constructor() {}

  // --- モーダル関連イベント ---

  setupRegisterEvents(onRegister, onClose) {
    const btnReg = document.getElementById("btn-do-register");
    const btnCloseReg = document.getElementById("btn-close-register");
    const regInput = document.getElementById("reg-name-input");

    if (btnReg) {
      btnReg.onclick = () => {
        const name = regInput ? regInput.value : "";
        if (onRegister) onRegister(name);
      };
    }
    if (btnCloseReg) {
      btnCloseReg.onclick = onClose;
    }
  }

  setupTransferEvents(callbacks) {
    // callbacks: { onIssue, onRecover, onClose }
    const btnIssue = document.getElementById("btn-issue-code");
    const btnRecover = document.getElementById("btn-do-recover");
    const recoverInput = document.getElementById("recover-code-input");
    const btnCloseTrans = document.getElementById("btn-close-transfer");

    if (btnIssue) {
      btnIssue.onclick = callbacks.onIssue;
    }
    if (btnRecover) {
      btnRecover.onclick = () => {
        const code = recoverInput ? recoverInput.value.trim() : "";
        if (callbacks.onRecover) callbacks.onRecover(code);
      };
    }
    if (btnCloseTrans) {
      btnCloseTrans.onclick = callbacks.onClose;
    }
  }

  // --- 汎用UIイベント（ここが重要です） ---

  setupGeneralUiEvents(callbacks) {
    // callbacks: { onStart, onAudioToggle, onRetry, onRetire, onHome }

    // 1. ゲーム開始ボタン
    const startBtn = document.getElementById("btn-start-game");
    if (startBtn && callbacks.onStart) {
      startBtn.addEventListener("click", callbacks.onStart);
    }

    // 2. オーディオ切り替えボタン
    const audioBtn = document.getElementById("btn-audio-toggle");
    if (audioBtn && callbacks.onAudioToggle) {
      audioBtn.addEventListener("click", callbacks.onAudioToggle);
    }

    // 3. リトライボタン
    const retryBtn = document.getElementById("btn-gameover-retry");
    if (retryBtn && callbacks.onRetry) {
      retryBtn.addEventListener("click", callbacks.onRetry);
    }

    // 4. リタイアボタン（今回のご指摘箇所）
    const retireBtn = document.getElementById("btn-retire");
    if (retireBtn && callbacks.onRetire) {
      retireBtn.addEventListener("click", callbacks.onRetire);
    }

    // 5. ホームに戻るボタン
    const homeBtn = document.getElementById("btn-gameover-home");
    if (homeBtn && callbacks.onHome) {
      homeBtn.addEventListener("click", callbacks.onHome);
    }
  }

  // --- UI更新処理 ---

  updateIssueButtonState(state) {
    const btnIssue = document.getElementById("btn-issue-code");
    if (!btnIssue) return;

    if (state === "issuing") {
      btnIssue.disabled = true;
      btnIssue.textContent = "ISSUING...";
    } else if (state === "issued") {
      btnIssue.textContent = "CODE ISSUED";
    } else if (state === "error") {
      btnIssue.textContent = "RETRY";
      btnIssue.disabled = false;
    } else if (state === "reset") {
      btnIssue.disabled = false;
      btnIssue.textContent = "ISSUE CODE";
    }
  }

  displayTransferCode(code) {
    const codeDisplay = document.getElementById("transfer-code-display");
    if (codeDisplay) codeDisplay.textContent = code;
  }

  setBgVideoVisible(isVisible) {
    const bgVideo = document.getElementById("bg-video");
    if (bgVideo) {
      bgVideo.style.display = isVisible ? "block" : "none";
    }
  }
}