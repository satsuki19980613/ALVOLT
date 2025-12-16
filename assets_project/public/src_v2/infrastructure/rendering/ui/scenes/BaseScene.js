// src_v2/infrastructure/rendering/ui/scenes/BaseScene.js
export class BaseScene {
  constructor(skinFactory) {
    this.skinFactory = skinFactory;
    this.buttons = []; // { x, y, w, h, id, text, active }
  }

  // 毎フレーム呼ばれる
  render(ctx, width, height, mousePos) {
    // Override me
  }

  // クリック判定
  handleClick(x, y) {
    for (const btn of this.buttons) {
      if (
        x >= btn.x && x <= btn.x + btn.w &&
        y >= btn.y && y <= btn.y + btn.h
      ) {
        return btn.id;
      }
    }
    return null;
  }
  
  // マウスホバー判定用
  checkHover(x, y) {
    for (const btn of this.buttons) {
        btn.isHover = (
            x >= btn.x && x <= btn.x + btn.w &&
            y >= btn.y && y <= btn.y + btn.h
        );
    }
  }
}