export class InputManager {
  constructor() {
    this.defaultKeyMap = {
      r: "move_up",
      ArrowUp: "move_up",
      f: "move_down",
      ArrowDown: "move_down",
      d: "move_left",
      ArrowLeft: "move_left",
      g: "move_right",
      ArrowRight: "move_right",
      a: "trade_long",
      z: "trade_short",
      " ": "trade_settle",
      e: "bet_up",
      w: "bet_down",
      y: "bet_all",
      t: "bet_min",
    };
    this.keyMap = { ...this.defaultKeyMap };

    this.actionStates = {};
    this.actionPressed = {};
    this.mousePos = { x: 0, y: 0 };
    this.mouseWorldPos = { x: 0, y: 0 };
    this.shootPressed = false;

    this.resetActionStates();
  }

  init(canvas) {
    this.loadKeyMap();
    window.addEventListener("keydown", this.handleKeyDown.bind(this));
    window.addEventListener("keyup", this.handleKeyUp.bind(this));
    window.addEventListener("blur", this.resetAllKeys.bind(this));

    if (canvas) {
      canvas.addEventListener("mousedown", (e) => {
        if (e.button === 0) this.setShootPressed();
      });
      canvas.addEventListener("mousemove", (e) => {
        const rect = canvas.getBoundingClientRect();
        this.mousePos.x = e.clientX - rect.left;
        this.mousePos.y = e.clientY - rect.top;
      });
    }
  }

  resetActionStates() {
    const allActions = [...new Set(Object.values(this.keyMap))];
    this.actionStates = {};
    this.actionPressed = {};
    for (const action of allActions) {
      this.actionStates[action] = false;
    }
    this.actionStates["shoot"] = false;
    this.shootPressed = false;
  }

  resetAllKeys() {
    for (const action in this.actionStates) {
      this.actionStates[action] = false;
    }
    this.actionPressed = {};
    this.shootPressed = false;
  }

  handleKeyDown(e) {
    const target = e.target;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
      return;
    }
    const key = e.key;
    const action = this.keyMap[key];
    if (action) {
      e.preventDefault();
      if (!this.actionStates[action]) {
        this.actionPressed[action] = true;
      }
      this.actionStates[action] = true;
    }
  }

  handleKeyUp(e) {
    const key = e.key;
    const action = this.keyMap[key];
    if (action) {
      e.preventDefault();
      this.actionStates[action] = false;
    }
  }

  setShootPressed() {
    this.shootPressed = true;
  }

  getInputState() {
    const inputState = {
      states: { ...this.actionStates },
      pressed: { ...this.actionPressed },
      mousePos: { ...this.mousePos },
      mouseWorldPos: { ...this.mouseWorldPos }
    };
    if (this.shootPressed) {
      inputState.pressed["shoot"] = true;
    }

    this.actionPressed = {};
    this.shootPressed = false;

    return inputState;
  }

  saveKeyMap() {
    localStorage.setItem("game_key_map", JSON.stringify(this.keyMap));
  }

  loadKeyMap() {
    const savedMap = localStorage.getItem("game_key_map");
    if (savedMap) {
      try {
        const parsedMap = JSON.parse(savedMap);
        this.keyMap = parsedMap;
        this.resetActionStates();
      } catch (error) {
        console.error("Failed to load key map:", error);
        this.keyMap = { ...this.defaultKeyMap };
      }
    } else {
      this.keyMap = { ...this.defaultKeyMap };
    }
  }

  setVirtualInput(action, isPressed) {
    this.actionStates[action] = isPressed;
    if (isPressed) {
      this.actionPressed[action] = true;
    }
  }

  setJoystickVector(x, y) {
    const threshold = 0.3;
    this.actionStates["move_right"] = x > threshold;
    this.actionStates["move_left"] = x < -threshold;
    this.actionStates["move_down"] = y > threshold;
    this.actionStates["move_up"] = y < -threshold;
  }
}