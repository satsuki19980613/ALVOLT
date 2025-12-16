import { skinFactory } from "../skins/SkinFactory.js";
import { PlayerSkins } from "../skins/players/PlayerSkins.js";
import { EnemySkins } from "../skins/enemies/EnemySkins.js";
import { ObstacleSkins } from "../skins/ObstacleSkins.js";
import { GridSkin } from "../skins/environment/GridSkin.js";
import { PixiSpritePool } from "./PixiSpritePool.js";
import { BulletType } from "../../../core/constants/Protocol.js";

const ASSET_MAP = {
  [BulletType.ORB]: {
    bullet: "bullet_orb",
    muzzle: "muzzle_orb",
    hit: "hit_orb",
  },
  [BulletType.SLASH]: {
    bullet: "bullet_slash",
    muzzle: "muzzle_slash",
    hit: "hit_slash",
  },
  [BulletType.FIREBALL]: {
    bullet: "bullet_fireball",
    muzzle: "muzzle_fireball",
    hit: "hit_fireball",
  },

  [BulletType.ENEMY]: {
    bullet: "bullet_trail_red",
    muzzle: "muzzle_trail_red",
    hit: "hit_trail_red",
  },

  enemy: {
    bullet: "bullet_trail_red",
    muzzle: "muzzle_trail_red",
    hit: "hit_trail_red",
  },

  [BulletType.DEFAULT]: {
    bullet: "bullet_orb",
    muzzle: "muzzle_orb",
    hit: "hit_orb",
  },
  [BulletType.ITEM_EP]: {
    bullet: "item_ep_body",
    muzzle: null,
    hit: "item_ep_get",
  },
};
export class PixiRenderer {
  constructor(canvasId) {
    this.canvasId = canvasId;
    this.app = null;
    this.layers = {
      background: new PIXI.Container(),
      game: new PIXI.Container(),
      effect: new PIXI.Container(),
    };
    this.layers.game.sortableChildren = true;
    this.sprites = new Map();
    this.gridSprite = null;

    this.PLAYER_SKIN_SIZE = 150;
    this.ENEMY_SKIN_SIZE = 120;

    this.particleRenderer = null;
    this.pool = new PixiSpritePool();
  }

  async init() {
    const canvas = document.getElementById(this.canvasId);
    if (!canvas) return;
    this.app = new PIXI.Application();
    await this.app.init({
      canvas: canvas,
      width: canvas.width,
      height: canvas.height,
      backgroundColor: "#000000ad",
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: false,
    });
    this.app.stage.addChild(this.layers.background);
    this.app.stage.addChild(this.layers.game);
    this.app.stage.addChild(this.layers.effect);
  }

  setupBackground(worldW, worldH, cellSize = 150) {
    this.layers.background.removeChildren();
    const drawFn = GridSkin.drawTile("rgba(255, 255, 255, 0.47)", 2);
    const gridTexture = skinFactory.getTexture(
      "bg_grid",
      cellSize,
      cellSize,
      drawFn
    );
    this.gridSprite = new PIXI.TilingSprite(gridTexture, worldW, worldH);
    this.layers.background.addChild(this.gridSprite);

    const border = new PIXI.Graphics();
    border.rect(0, 0, worldW, worldH);
    border.stroke({ width: 4, color: 0x00ffff, alpha: 0.5 });
    this.layers.background.addChild(border);
  }

  resize(width, height) {
    if (this.app && this.app.renderer) {
      this.app.renderer.resize(width, height);
    }
  }

  updateCamera(centerX, centerY, scale) {
    if (!this.app) return;
    const screenW = this.app.screen.width;
    const screenH = this.app.screen.height;

    [this.layers.background, this.layers.game, this.layers.effect].forEach(
      (layer) => {
        layer.scale.set(scale);
        layer.pivot.set(centerX, centerY);
        layer.position.set(screenW / 2, screenH / 2);
      }
    );
  }

  render(visualState) {
    this.syncSprites(visualState.players, "player");
    this.syncSprites(visualState.enemies, "enemy");
    this.syncSprites(visualState.bullets, "bullet");
    this.syncSprites(visualState.obstacles, "obstacle");

    this.cleanupSprites(visualState);
  }

  syncSprites(entities, type) {
    entities.forEach((entity) => {
      let visual = this.sprites.get(entity.id);

      if (!visual) {
        if (type === "bullet") {
          visual = this.createVisual(entity, type);
        } else {
          visual = this.createVisual(entity, type);
        }

        this.sprites.set(entity.id, visual);
        this.layers.game.addChild(visual.container);
      }

      visual.container.x = entity.x;
      visual.container.y = entity.y;

      if (type === "player") {
        visual.chassis.rotation = entity.rotationAngle + Math.PI / 2;
        visual.turret.rotation =
          entity.aimAngle !== undefined
            ? entity.aimAngle
            : entity.rotationAngle;
        this.updateHPBar(visual.hpBar, entity.hp, 100, 60);
      } else if (type === "enemy") {
        visual.body.rotation =
          entity.targetAngle !== undefined
            ? entity.targetAngle
            : entity.angle || 0;
        this.updateHPBar(visual.hpBar, entity.hp, 50, 50);
      } else if (type === "bullet") {
        visual.container.rotation = entity.angle;
      } else if (type === "obstacle") {
        visual.container.rotation = entity.rotation || 0;
        this.updateObstacleTexture(visual, entity);
      }
    });
  }

  createVisual(entity, type) {
    const container = new PIXI.Container();
    const hpBar = new PIXI.Graphics();

    if (type === "obstacle") container.zIndex = 10;
    else if (type === "enemy") container.zIndex = 50;
    else if (type === "player") container.zIndex = 100;
    else if (type === "bullet") container.zIndex = 200;

    if (type === "player") {
      const color = entity.color || "#00e5ff";
      const chassisTex = skinFactory.getTexture(
        `player_chassis_${color}`,
        this.PLAYER_SKIN_SIZE,
        this.PLAYER_SKIN_SIZE,
        PlayerSkins.chassis(color)
      );
      const turretTex = skinFactory.getTexture(
        `player_turret_${color}`,
        this.PLAYER_SKIN_SIZE,
        this.PLAYER_SKIN_SIZE,
        PlayerSkins.turret(color)
      );
      const chassis = new PIXI.Sprite(chassisTex);
      chassis.anchor.set(0.5);
      const turret = new PIXI.Sprite(turretTex);
      turret.anchor.set(0.5);
      const textStyle = new PIXI.TextStyle({
        fontFamily: "'Roboto Mono', monospace",
        fontSize: 12,
        fontWeight: "bold",
        fill: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      });
      const text = new PIXI.Text({
        text: entity.name || "Guest",
        style: textStyle,
      });
      text.anchor.set(0.5);
      text.y = -110;

      container.addChild(chassis, turret, text);
      if (!entity.isMe) {
        hpBar.y = -95;
        container.addChild(hpBar);
      }
      return { container, chassis, turret, text, hpBar, type };
    } else if (type === "enemy") {
      const bodyTex = skinFactory.getTexture(
        "enemy_heavy_tank",
        this.ENEMY_SKIN_SIZE,
        this.ENEMY_SKIN_SIZE,
        EnemySkins.heavyTank()
      );
      const body = new PIXI.Sprite(bodyTex);
      body.anchor.set(0.5);
      hpBar.y = -60;
      container.addChild(body, hpBar);
      return { container, body, hpBar, type };
    } else if (type === "bullet") {
      const typeId = entity.type || BulletType.ORB;

      const mapping = ASSET_MAP[typeId] || ASSET_MAP[BulletType.ORB];
      const assetKey = mapping.bullet;
      let sprite;

      try {
        const sheet = PIXI.Assets.get(assetKey);
        if (sheet && sheet.animations) {
          const animKey = Object.keys(sheet.animations)[0];
          sprite = new PIXI.AnimatedSprite(sheet.animations[animKey]);
          let targetSize = 80 * 2.5;

          if (assetKey === "bullet_fireball") {
            targetSize *= 2.0;
          }

          const scale = targetSize / Math.max(sprite.width, sprite.height);
          sprite.scale.set(scale);
          sprite.loop = true;
          const isItemEp =
            typeId === BulletType.ITEM_EP ||
            (assetKey && assetKey.includes("item_ep"));

          if (isItemEp) {
            sprite.animationSpeed = 0.35;

            sprite.tint = 0xffffff;
            sprite.alpha = 1.0;

            sprite.blendMode = "normal";
          } else {
            sprite.animationSpeed = 0.5;
            sprite.blendMode = "add";
            sprite.tint = 0xffffff;
            sprite.alpha = 1.0;
          }
          sprite.play();
          sprite.blendMode = "add";

          let offsetDist = 0;

          if (typeId === BulletType.ENEMY || typeId === "enemy") {
            offsetDist = 70;
          } else {
            offsetDist = 85;
          }

          const muzzleX = entity.x + Math.cos(entity.angle) * offsetDist;
          const muzzleY = entity.y + Math.sin(entity.angle) * offsetDist;

          this.playOneShotEffect(
            mapping.muzzle,
            muzzleX,
            muzzleY,
            entity.angle
          );
        } else {
          throw new Error("Asset not found");
        }
      } catch (e) {
        console.warn(`[PixiRenderer] Fallback for bullet ${assetKey}`, e);
        sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
        sprite.width = 20;
        sprite.height = 10;
      }

      sprite.anchor.set(0.5);

      sprite.rotation = 0;

      container.addChild(sprite);
      return { container, sprite, type, typeId };
    } else if (type === "obstacle") {
      const sprite = new PIXI.Sprite();
      sprite.anchor.set(0.5);
      container.addChild(sprite);
      const visual = { container, sprite, type, currentSkinKey: null };
      this.updateObstacleTexture(visual, entity);
      return visual;
    }
  }

  playOneShotEffect(assetKey, x, y, rotation = 0) {
    if (!assetKey) return;

    const sheet = PIXI.Assets.get(assetKey);
    if (!sheet || !sheet.animations) return;

    const animKey = Object.keys(sheet.animations)[0];
    const effect = new PIXI.AnimatedSprite(sheet.animations[animKey]);
    effect.scale.set(0.5);
    effect.blendMode = "add";
    effect.anchor.set(0.5);
    effect.x = x;
    effect.y = y;
    effect.rotation = rotation;
    effect.loop = false;
    effect.animationSpeed = 0.5;

    effect.onComplete = () => {
      effect.destroy();
    };

    this.layers.effect.addChild(effect);
    effect.play();
  }

  updateObstacleTexture(visual, entity) {
    const styleType = entity.styleType || "default";
    const width = entity.width || 100;
    const height = entity.height || 100;
    const isAnimated = styleType.includes("animated");
    if (!isAnimated) {
      const skinKey = `obs_${styleType}_${width}_${height}`;
      if (visual.currentSkinKey !== skinKey) {
        let drawFunc = ObstacleSkins[styleType];
        if (typeof drawFunc === "function" && drawFunc.length >= 1) {
          drawFunc = drawFunc(0.0);
        }
        if (typeof drawFunc !== "function") {
          drawFunc = ObstacleSkins["default"];
        }
        const texture = skinFactory.getTexture(
          skinKey,
          width,
          height,
          drawFunc
        );
        visual.sprite.texture = texture;
        visual.currentSkinKey = skinKey;
        visual.sprite.width = width;
        visual.sprite.height = height;
      }
    } else {
      const skinKey = `obs_anim_${styleType}_${width}_${height}`;
      const skinFactoryFunc = ObstacleSkins[styleType];
      if (typeof skinFactoryFunc === "function") {
        const totalFrames = 60;
        const textures = skinFactory.getAnimationTextures(
          skinKey,
          width,
          height,
          skinFactoryFunc,
          totalFrames
        );
        const loopTime = 4000;
        const progress = (Date.now() % loopTime) / loopTime;
        const frameIndex = Math.floor(progress * totalFrames);
        visual.sprite.texture = textures[frameIndex];
        visual.sprite.width = width;
        visual.sprite.height = height;
        visual.currentSkinKey = skinKey;
      }
    }
  }

  updateHPBar(graphics, currentHp, maxHp, width) {
    if (!graphics) return;
    graphics.clear();
    if (currentHp <= 0) return;
    const height = 6;
    const ratio = Math.max(0, Math.min(1, currentHp / maxHp));
    const barW = width * ratio;
    let color = 0x00ff00;
    if (ratio < 0.3) color = 0xff0000;
    else if (ratio < 0.6) color = 0xffff00;

    graphics
      .rect(-width / 2, 0, width, height)
      .fill({ color: 0x000000, alpha: 0.6 });
    graphics
      .rect(-width / 2, 0, barW, height)
      .fill({ color: color, alpha: 0.8 });
    graphics
      .rect(-width / 2, 0, width, height)
      .stroke({ width: 1, color: 0xffffff, alpha: 0.3 });
  }

  cleanupSprites(visualState) {
    const activeIds = new Set();
    visualState.players.forEach((e) => activeIds.add(e.id));
    visualState.enemies.forEach((e) => activeIds.add(e.id));
    visualState.bullets.forEach((e) => activeIds.add(e.id));
    visualState.obstacles.forEach((e) => activeIds.add(e.id));

    for (const [id, visual] of this.sprites) {
      if (!activeIds.has(id)) {
        this.layers.game.removeChild(visual.container);

        visual.container.destroy({ children: true });
        this.sprites.delete(id);
      }
    }
  }
}
