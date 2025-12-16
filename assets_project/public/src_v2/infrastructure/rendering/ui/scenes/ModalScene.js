// src_v2/infrastructure/rendering/ui/scenes/ModalScene.js
import { BaseScene } from "./BaseScene.js";

export class ModalScene extends BaseScene {
  constructor(skinFactory) {
    super(skinFactory);
    this.frameCount = 0;
  }

  // モーダルはHTMLが主体ですが、Canvasで背景演出を加えます
  render(ctx, width, height, mousePos) {
    this.frameCount++;

    // 1. 背景を半透明の黒で覆う (Dimming)
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, width, height);

    // 2. 走査線エフェクト (薄く)
    ctx.fillStyle = `rgba(0, 255, 255, 0.03)`;
    const scanY = (this.frameCount * 2) % height;
    ctx.fillRect(0, scanY, width, 4);

    // 3. 背面の装飾 (中央に向かって収束するラインなど)
    const cx = width / 2;
    const cy = height / 2;
    
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(255, 0, 85, 0.2)";
    ctx.lineWidth = 1;
    
    const size = 300 + Math.sin(this.frameCount * 0.05) * 10;
    
    // 回転する六角形風の装飾
    ctx.translate(cx, cy);
    ctx.rotate(this.frameCount * 0.01);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const px = Math.cos(angle) * size;
        const py = Math.sin(angle) * size;
        if(i===0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}