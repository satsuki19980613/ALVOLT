export class FullscreenManager {
  constructor() {
    this.btn = document.getElementById("btn-fullscreen-toggle");
    this.iconEnter = document.getElementById("icon-fullscreen-enter");
    this.iconExit = document.getElementById("icon-fullscreen-exit");
  }

  init() {
    if (this.btn) {
      this.btn.addEventListener("click", (e) => {
        e.preventDefault();
        this.toggle();
      });
    }

    const handleStateChange = () => this.updateIcon();
    document.addEventListener("fullscreenchange", handleStateChange);
    document.addEventListener("webkitfullscreenchange", handleStateChange);
    document.addEventListener("mozfullscreenchange", handleStateChange);
    document.addEventListener("MSFullscreenChange", handleStateChange);

    this.updateIcon();
  }

  request() {
    const doc = window.document;
    const docEl = doc.documentElement;

    if (this._isFullscreen()) return;

    const requestFn =
      docEl.requestFullscreen ||
      docEl.webkitRequestFullscreen ||
      docEl.webkitRequestFullScreen ||
      docEl.mozRequestFullScreen ||
      docEl.msRequestFullscreen;

    if (requestFn) {
      const promise = requestFn.call(docEl, { navigationUI: "hide" });

      if (promise && typeof promise.catch === "function") {
        promise.catch((e) => {
          console.warn("Fullscreen request denied:", e);
        });
      }
    }
  }

  exit() {
    const doc = window.document;
    if (!this._isFullscreen()) return;

    const exit =
      doc.exitFullscreen ||
      doc.webkitExitFullscreen ||
      doc.mozCancelFullScreen ||
      doc.msExitFullscreen;

    if (exit) {
      exit.call(doc).catch((err) => console.log(err));
    }
  }

  toggle() {
    if (this._isFullscreen()) {
      this.exit();
    } else {
      this.request();
    }
  }

  updateIcon() {
    const isFull = this._isFullscreen();
    if (this.iconEnter && this.iconExit) {
      if (isFull) {
        this.iconEnter.classList.add("hidden");
        this.iconExit.classList.remove("hidden");
      } else {
        this.iconEnter.classList.remove("hidden");
        this.iconExit.classList.add("hidden");
      }
    }

    const triggers = [100, 300, 600];
    triggers.forEach((delay) => {
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, delay);
    });
  }

  _isFullscreen() {
    const doc = window.document;
    return !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );
  }
}
