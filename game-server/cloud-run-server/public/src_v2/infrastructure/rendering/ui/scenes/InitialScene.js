// src_v2/infrastructure/rendering/ui/scenes/InitialScene.js
import { BaseScene } from "./BaseScene.js";

export class InitialScene extends BaseScene {
  constructor(skinFactory) {
    super(skinFactory);
    this.frameCount = 0;
  }

  render(ctx, width, height, mousePos) {
    this.frameCount++;
    const cx = width / 2;
    const cy = height / 2;

    const btnW = 260;
    const btnH = 50;
    const gap = 20; // ボタン同士の間隔

    // ロゴ(ALVOLT)の下にボタンが来るようにY座標を調整
    // 3つになるので少し開始位置を上げても良いかもしれません
    const startY = cy + 100;

    // ボタン配列を再定義
    this.buttons = [
      { 
        id: "start_register", 
        text: "REGISTER & START", 
        x: cx - btnW / 2, 
        y: startY, 
        w: btnW, 
        h: btnH, 
        active: true 
      },
      { 
        id: "start_guest", 
        text: "GUEST PLAY", 
        x: cx - btnW / 2, 
        y: startY + (btnH + gap), // 2番目の位置
        w: btnW, 
        h: btnH, 
        active: false 
      },
      // ★追加: データ引継ぎボタン
      { 
        id: "open_transfer", 
        text: "DATA TRANSFER", 
        x: cx - btnW / 2, 
        y: startY + (btnH + gap) * 2, // 3番目の位置
        w: btnW, 
        h: btnH, 
        active: false 
      }
    ];

    this.checkHover(mousePos.x, mousePos.y);

    this.buttons.forEach(btn => {
      const img = this.skinFactory.getButton(btn.w, btn.h, btn.text, btn.active, btn.isHover);
      ctx.drawImage(img, btn.x - 10, btn.y - 10);
    });
  }
}