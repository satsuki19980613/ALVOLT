export class MobileControlManager {
  constructor(inputManager) {
    this.inputManager = inputManager;
    this.mobileControlsLayer = document.getElementById("mobile-controls-layer");
    this.mcLotDisplay = document.getElementById("mc-lot-display");
    this.mcJoystickArea = document.getElementById("mc-joystick-area");
    this.mcJoystickKnob = document.getElementById("mc-joystick-knob");
    this.mcLotDisplay = document.getElementById("mc-lot-display");

    this.joystickState = {
      active: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      maxDist: 40,
    };
  }

  init() {
    this.setupControls();
  }

  setupControls() {
    if (!this.mobileControlsLayer) return;
    const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isMobile) {
      document.body.classList.add("is-mobile");
    }

    const addInputListener = (elemId, action) => {
      const elem = document.getElementById(elemId);
      if (!elem) return;

      const startHandler = (e) => {
        e.preventDefault();
        if (this.inputManager) {
          if (action === "shoot") this.inputManager.setShootPressed();
          else this.inputManager.setVirtualInput(action, true);
        }
      };

      const endHandler = (e) => {
        e.preventDefault();
        if (this.inputManager && action !== "shoot") {
          this.inputManager.setVirtualInput(action, false);
        }
      };

      elem.addEventListener("touchstart", startHandler, { passive: false });
      elem.addEventListener("mousedown", startHandler);
      elem.addEventListener("touchend", endHandler);
      elem.addEventListener("mouseup", endHandler);

      elem.addEventListener("mouseleave", endHandler);
    };

    addInputListener("mc-btn-fire", "shoot");
    addInputListener("mc-btn-short", "trade_short");
    addInputListener("mc-btn-long", "trade_long");
    addInputListener("mc-btn-settle", "trade_settle");

    const setupTrigger = (id, action) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const handler = (e) => {
        e.preventDefault();
        if (this.inputManager) {
          this.inputManager.setVirtualInput(action, true);
          setTimeout(
            () => this.inputManager.setVirtualInput(action, false),
            100
          );
        }
      };
      btn.addEventListener("touchstart", handler, { passive: false });
      btn.addEventListener("mousedown", handler);
    };
    setupTrigger("mc-btn-lot-plus", "bet_up");
    setupTrigger("mc-btn-lot-minus", "bet_down");

    addInputListener("mc-btn-turn-left", "move_left");
    addInputListener("mc-btn-turn-right", "move_right");
  }



  updateDisplay(playerState) {
    if (this.mcLotDisplay && playerState) {
      const bet = Math.ceil(playerState.chargeBetAmount || 10);
      this.mcLotDisplay.textContent = bet;
    }
  }

  applyScreenMode(screenId) {
    document.body.classList.remove("mode-menu", "mode-game");
    if (screenId === "game") {
      document.body.classList.add("mode-game");
    } else {
      document.body.classList.add("mode-menu");
    }
  }
}
