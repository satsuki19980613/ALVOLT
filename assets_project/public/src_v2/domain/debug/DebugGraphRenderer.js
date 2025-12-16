export class DebugGraphRenderer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
  }

  setCanvas(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
  }

  draw(recorder) {
    if (!this.canvas || !this.ctx) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const samples = recorder.getHistory();

    // 背景クリア
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.fillRect(0, 0, width, height);

    if (samples.length < 2) return;

    // ガイドライン (16ms = 1フレーム遅延, 33ms = 2フレーム遅延)
    this._drawLine(height, 16.6, "#00ff00", 1); // 緑: 1フレーム
    this._drawLine(height, 33.3, "#ffff00", 1); // 黄: 2フレーム
    this._drawLine(height, 50.0, "#ff0000", 1); // 赤: 危険域

    // グラフ描画
    this.ctx.beginPath();
    this.ctx.strokeStyle = "#00ffff";
    this.ctx.lineWidth = 2;

    const maxGraphValue = 60; // グラフの天井(ms)
    const stepX = width / samples.length;

    samples.forEach((sample, i) => {
      // 値を高さに変換 (下が0)
      const y = height - (Math.min(sample.v, maxGraphValue) / maxGraphValue) * height;
      const x = i * stepX;

      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    });

    this.ctx.stroke();
  }

  _drawLine(height, msVal, color, lineWidth) {
    const maxGraphValue = 60;
    const y = height - (msVal / maxGraphValue) * height;
    this.ctx.beginPath();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.setLineDash([2, 2]);
    this.ctx.moveTo(0, y);
    this.ctx.lineTo(this.canvas.width, y);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }
}