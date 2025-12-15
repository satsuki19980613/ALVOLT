// src_v2/infrastructure/rendering/ui/SkinFactoryUI.js

export class SkinFactoryUI {
  constructor() {
    this.cache = new Map();
  }

  /**
   * サイバーパンク風ボタンのテクスチャを生成・取得
   */
  getButton(width, height, text, isActive, isHover) {
    const key = `btn_${width}_${height}_${text}_${isActive}_${isHover}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const canvas = document.createElement("canvas");
    canvas.width = width + 20; // 発光分マージン
    canvas.height = height + 20;
    const ctx = canvas.getContext("2d");
    
    // 原点を少しずらして描画領域を確保
    ctx.translate(10, 10);

    const mainColor = isActive ? "#ff0055" : "#00ffff";
    const bgColor = isHover ? "rgba(0, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.8)";

    // 1. 背景 (パスで角を少し削る)
    ctx.fillStyle = bgColor;
    this._drawCutRect(ctx, 0, 0, width, height, 10);
    ctx.fill();

    // 2. 枠線 (グロー表現: 重ね描き)
    ctx.globalCompositeOperation = "lighter";
    
    // 外側の薄い光
    ctx.strokeStyle = isActive ? "rgba(255, 0, 85, 0.3)" : "rgba(0, 255, 255, 0.3)";
    ctx.lineWidth = 4;
    this._drawCutRect(ctx, 0, 0, width, height, 10);
    ctx.stroke();

    // 内側の強い光
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2;
    this._drawCutRect(ctx, 0, 0, width, height, 10);
    ctx.stroke();

    ctx.globalCompositeOperation = "source-over";

    // 3. テキスト
    ctx.fillStyle = mainColor;
    ctx.font = "bold 16px 'Orbitron', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, width / 2, height / 2);

    this.cache.set(key, canvas);
    return canvas;
  }

  _drawCutRect(ctx, x, y, w, h, cut) {
    ctx.beginPath();
    ctx.moveTo(x + cut, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - cut);
    ctx.lineTo(x + w - cut, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + cut);
    ctx.closePath();
  }
}