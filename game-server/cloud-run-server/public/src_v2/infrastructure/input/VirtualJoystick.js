/**
 * 仮想ジョイスティックとタッチボタンの制御
 */
export class VirtualJoystick {
  constructor(domListener) {
    this.domListener = domListener; // DomInputListenerへの参照
    this.joystickState = { active: false, startX: 0, startY: 0, maxDist: 40 };
    this.uiElements = {};
  }

  init() {
    this.uiElements.area = document.getElementById("mc-joystick-area");
    this.uiElements.knob = document.getElementById("mc-joystick-knob");
    
    if (this.uiElements.area) {
        this.setupJoystick();
    }
    
    this.setupButton("mc-btn-fire", "shoot", true);
    this.setupButton("mc-btn-short", "trade_short");
    this.setupButton("mc-btn-long", "trade_long");
    this.setupButton("mc-btn-settle", "trade_settle");
    this.setupButton("mc-btn-lot-plus", "bet_up");
    this.setupButton("mc-btn-lot-minus", "bet_down");
  }

  setupJoystick() {
    const { area, knob } = this.uiElements;
    const start = (cx, cy) => {
        this.joystickState.active = true;
        this.joystickState.startX = cx;
        this.joystickState.startY = cy;
    };
    const move = (cx, cy) => {
        if (!this.joystickState.active) return;
        let dx = cx - this.joystickState.startX;
        let dy = cy - this.joystickState.startY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > this.joystickState.maxDist) {
            dx = (dx/dist) * this.joystickState.maxDist;
            dy = (dy/dist) * this.joystickState.maxDist;
        }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        
        // Input反映 (簡易)
        const threshold = 0.3;
        const nx = dx / this.joystickState.maxDist;
        const ny = dy / this.joystickState.maxDist;
        
        this.domListener.actionStates["move_right"] = nx > threshold;
        this.domListener.actionStates["move_left"] = nx < -threshold;
        this.domListener.actionStates["move_down"] = ny > threshold;
        this.domListener.actionStates["move_up"] = ny < -threshold;
    };
    const end = () => {
        this.joystickState.active = false;
        knob.style.transform = `translate(0px, 0px)`;
        this.domListener.actionStates["move_right"] = false;
        this.domListener.actionStates["move_left"] = false;
        this.domListener.actionStates["move_down"] = false;
        this.domListener.actionStates["move_up"] = false;
    };

    area.addEventListener("touchstart", e => { e.preventDefault(); start(e.changedTouches[0].clientX, e.changedTouches[0].clientY); }, { passive: false });
    area.addEventListener("touchmove", e => { e.preventDefault(); move(e.changedTouches[0].clientX, e.changedTouches[0].clientY); }, { passive: false });
    area.addEventListener("touchend", e => { e.preventDefault(); end(); });
  }

  setupButton(id, action, isShoot = false) {
      const btn = document.getElementById(id);
      if (!btn) return;
      const start = (e) => {
          e.preventDefault();
          if (isShoot) this.domListener.shootPressed = true;
          else {
              this.domListener.actionStates[action] = true;
              this.domListener.actionPressed[action] = true;
          }
      };
      const end = (e) => {
          e.preventDefault();
          if (!isShoot) this.domListener.actionStates[action] = false;
      };
      btn.addEventListener("touchstart", start, { passive: false });
      btn.addEventListener("touchend", end);
  }
}