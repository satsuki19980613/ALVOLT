/**
 * ゲームループ（定期実行タスク）の管理
 */
export class GameLoop {
  constructor() {
    this.intervals = new Map();
    this.isRunning = false;
  }

  start(name, callback, intervalMs) {
    if (this.intervals.has(name)) {
      clearInterval(this.intervals.get(name));
    }
    const id = setInterval(callback, intervalMs);
    this.intervals.set(name, id);
    this.isRunning = true;
  }

  stop(name) {
    if (this.intervals.has(name)) {
      clearInterval(this.intervals.get(name));
      this.intervals.delete(name);
    }
  }

  stopAll() {
    this.intervals.forEach((id) => clearInterval(id));
    this.intervals.clear();
    this.isRunning = false;
  }
}