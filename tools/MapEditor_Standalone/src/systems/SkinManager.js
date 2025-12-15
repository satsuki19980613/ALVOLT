export class SkinManager {
  constructor() {
    this.skinCache = new Map();
  }

  /**
   * スキン画像(Canvas)を取得または生成する
   */
  getSkin(key, width, height, drawFunction) {
    const cacheKey = `${key}_${width}_${height}`;

    if (this.skinCache.has(cacheKey)) {
      return this.skinCache.get(cacheKey);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (drawFunction) {
      drawFunction(ctx, width, height);
    } else {
      ctx.strokeStyle = "#ff00ff";
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, width, height);
    }

    this.skinCache.set(cacheKey, canvas);
    return canvas;
  }
}

export const skinManager = new SkinManager();
