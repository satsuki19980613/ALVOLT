export class AudioUiManager {
  constructor(uiRenderer) {
    this.uiRenderer = uiRenderer;
    this.els = {
      btnToggle: document.getElementById("btn-audio-toggle"),
      loadingContainer: document.getElementById("audio-loading-container"),
      loadingBar: document.getElementById("audio-loading-bar"),
      notification: document.getElementById("music-notification"),
      notificationTitle: document.getElementById("music-title"),
    };
    this.notificationTimer = null;
  }

  setLoadingState(isLoading) {
    if (this.els.loadingContainer) {
      this.els.loadingContainer.style.display = isLoading ? "block" : "none";
    }
    if (isLoading && this.els.loadingBar) {
      this.els.loadingBar.style.width = "0%";
    }
  }

  updateLoadingProgress(percent) {
    if (this.els.loadingBar) {
      this.els.loadingBar.style.width = `${percent}%`;
    }
  }

  updateButton(isMuted) {
    if (this.uiRenderer) {
      this.uiRenderer.setAudioState(isMuted);
    }
    if (this.els.btnToggle) {
      this.els.btnToggle.textContent = isMuted ? "🔇 BGM: OFF" : "🔊 BGM: ON";
    }
  }

  showNotification(title) {
    if (!this.els.notification || !this.els.notificationTitle) return;
    
    this.els.notificationTitle.textContent = title;
    this.els.notification.classList.remove("hidden");
    
    // アニメーションリセットのためのリフロー
    void this.els.notification.offsetWidth;
    
    requestAnimationFrame(() => {
      this.els.notification.classList.add("show");
    });

    if (this.notificationTimer) clearTimeout(this.notificationTimer);
    
    this.notificationTimer = setTimeout(() => {
      this.els.notification.classList.remove("show");
      setTimeout(() => this.els.notification.classList.add("hidden"), 600);
    }, 5000);
  }
}