import { InputMapping } from "../../logic/InputMapping.js";

/**
 * DOMイベント(キーボード、マウス)を監視するリスナー
 */
export class DomInputListener {
  constructor(canvas) {
    this.canvas = canvas;
    this.keyMap = { ...InputMapping.DEFAULT_MAP };
    this.actionStates = {};
    this.actionPressed = {};
    this.mousePos = { x: 0, y: 0 };
    this.shootPressed = false;
  }

  init() {
    window.addEventListener("keydown", (e) => this.handleKeyDown(e));
    window.addEventListener("keyup", (e) => this.handleKeyUp(e));
    if (this.canvas) {
        this.canvas.addEventListener("mousedown", (e) => {
            if (e.button === 0) this.shootPressed = true;
        });
        this.canvas.addEventListener("mousemove", (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos.x = e.clientX - rect.left;
            this.mousePos.y = e.clientY - rect.top;
        });
    }
    window.addEventListener("blur", () => this.resetAll());
  }

  handleKeyDown(e) {
    if (e.target.tagName === "INPUT") return;
    const action = InputMapping.getActionForKey(e.key, this.keyMap);
    if (action) {
      e.preventDefault();
      if (!this.actionStates[action]) this.actionPressed[action] = true;
      this.actionStates[action] = true;
    }
  }

  handleKeyUp(e) {
    const action = InputMapping.getActionForKey(e.key, this.keyMap);
    if (action) {
      e.preventDefault();
      this.actionStates[action] = false;
    }
  }

  resetAll() {
    this.actionStates = {};
    this.actionPressed = {};
    this.shootPressed = false;
  }

  getInputState() {
    const state = {
      states: { ...this.actionStates },
      pressed: { ...this.actionPressed },
      shoot: this.shootPressed,
      mousePos: { ...this.mousePos },
      mouseWorldPos: { x: 0, y: 0 } // ★ここを追加しました
    };
    // フレームごとにPressed状態はリセット
    this.actionPressed = {};
    this.shootPressed = false;
    return state;
  }
}
