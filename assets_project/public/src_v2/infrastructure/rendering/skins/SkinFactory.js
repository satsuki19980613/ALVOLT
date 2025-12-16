/**
 * Canvas APIを用いてテクスチャを生成・キャッシュするファクトリ
 */
export class SkinFactory {
  constructor() {
    this.cache = new Map();
    this.textureCache = new Map();

    this.animationCache = new Map();
  }

  getSkin(key, width, height, drawFn) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (drawFn) {
      drawFn(ctx, width, height);
    } else {
      ctx.strokeStyle = "#ff00ff";
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, width, height);
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  getTexture(key, width, height, drawFn) {
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key);
    }

    const canvas = this.getSkin(key, width, height, drawFn);
    const texture = PIXI.Texture.from(canvas);

    this.textureCache.set(key, texture);
    return texture;
  }

  getAnimationTextures(key, width, height, drawFactoryFn, frameCount = 60) {
    if (this.animationCache.has(key)) {
      return this.animationCache.get(key);
    }

    const textures = [];
    for (let i = 0; i < frameCount; i++) {
      const progress = i / frameCount;

      const drawFn = drawFactoryFn(progress);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      drawFn(ctx, width, height);

      const texture = PIXI.Texture.from(canvas);
      textures.push(texture);
    }

    this.animationCache.set(key, textures);
    return textures;
  }
}

export const skinFactory = new SkinFactory();
