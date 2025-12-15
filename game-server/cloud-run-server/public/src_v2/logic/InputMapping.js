/**
 * キー入力とアクションのマッピングロジック
 */
export const InputMapping = {
  DEFAULT_MAP: {
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
  },

  getActionForKey(key, keyMap) {
    const map = keyMap || this.DEFAULT_MAP;
    return map[key] || null;
  }
};