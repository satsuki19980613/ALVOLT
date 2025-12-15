import { CollisionLogic } from "../../logic/CollisionLogic.js";
import { BulletType } from "../../core/constants/Protocol.js";
import { ItemLogic } from "../../logic/ItemLogic.js";
import { GameConstants } from "../../core/constants/GameConstants.js";

class SpatialGrid {
  constructor(width, height, cellSize) {
    this.cellSize = cellSize;
    this.grid = new Map();
    this.staticGrid = new Map();
  }

  clearDynamic() {
    this.grid.clear();
  }

  insertStatic(entity) {
    this._addToGrid(entity, this.staticGrid);
  }

  insertDynamic(entity) {
    this._addToGrid(entity, this.grid);
  }

  _getKey(x, y) {
    return (x << 16) | (y & 0xffff);
  }

  _addToGrid(entity, map) {
    const r =
      entity.radius ||
      Math.max(entity.width || 0, entity.height || 0) / 2;
    const minX = Math.floor((entity.x - r) / this.cellSize);
    const maxX = Math.floor((entity.x + r) / this.cellSize);
    const minY = Math.floor((entity.y - r) / this.cellSize);
    const maxY = Math.floor((entity.y + r) / this.cellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const key = this._getKey(x, y);
        let cell = map.get(key);
        if (!cell) {
          cell = [];
          map.set(key, cell);
        }
        cell.push(entity);
      }
    }
  }

  getNearby(entity) {
    const r = entity.radius || 0;
    const minX = Math.floor((entity.x - r) / this.cellSize);
    const maxX = Math.floor((entity.x + r) / this.cellSize);
    const minY = Math.floor((entity.y - r) / this.cellSize);
    const maxY = Math.floor((entity.y + r) / this.cellSize);

    const result = new Set();
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const key = this._getKey(x, y);
        if (this.staticGrid.has(key)) {
          const statics = this.staticGrid.get(key);
          for (const e of statics) result.add(e);
        }
        if (this.grid.has(key)) {
          const dynamics = this.grid.get(key);
          for (const e of dynamics) if (e !== entity) result.add(e);
        }
      }
    }
    return result;
  }

  /**
   * ★追加: AimingServiceから呼ばれるメソッド
   */
  getNearbyWithRadius(entity, radius) {
    const minX = Math.floor((entity.x - radius) / this.cellSize);
    const maxX = Math.floor((entity.x + radius) / this.cellSize);
    const minY = Math.floor((entity.y - radius) / this.cellSize);
    const maxY = Math.floor((entity.y + radius) / this.cellSize);

    const result = new Set();
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const key = this._getKey(x, y);

        if (this.staticGrid.has(key)) {
          const statics = this.staticGrid.get(key);
          for (const e of statics) {
              result.add(e);
          }
        }
        if (this.grid.has(key)) {
          const dynamics = this.grid.get(key);
          for (const e of dynamics) {
            if (e !== entity) result.add(e);
          }
        }
      }
    }
    return result;
  }
}

export class PhysicsSystem {
  constructor(worldWidth, worldHeight) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.grid = new SpatialGrid(
      worldWidth,
      worldHeight,
      GameConstants.GRID_CELL_SIZE
    );
    this.staticInitialized = false;

    this.tempPos = { x: 0, y: 0 };
    this.tempPushVector = { x: 0, y: 0 };
  }

  initStatic(obstacles) {
    if (this.staticInitialized) return;
    for (const obs of obstacles) {
      this.grid.insertStatic(obs);
    }
    this.staticInitialized = true;
  }

  update(worldState, dt = 1.0) {
    if (!this.staticInitialized) this.initStatic(worldState.obstacles);

    this.grid.clearDynamic();
    
    // グリッド登録
    for (const p of worldState.players.values()) {
      if (!p.isDead) this.grid.insertDynamic(p);
    }
    for (const e of worldState.enemies) {
      this.grid.insertDynamic(e);
    }
    for (const b of worldState.bullets) {
      this.grid.insertDynamic(b);
    }

    // プレイヤー更新
    for (const p of worldState.players.values()) {
      if (!p.isDead) this._updateSingleEntity(p);
    }

    // 敵更新
    for (const e of worldState.enemies) {
      this._updateSingleEntity(e);
    }

    this.resolveEntityCollisions(worldState);
    this.updateBullets(worldState);
  }

  _updateSingleEntity(entity) {
    if (entity.vx !== 0 || entity.vy !== 0) {
      entity.x += entity.vx;
      entity.y += entity.vy;
    }

    this.resolveObstacleCollisions(entity);

    CollisionLogic.clampPosition(
      entity.x,
      entity.y,
      entity.radius,
      this.worldWidth,
      this.worldHeight,
      this.tempPos
    );
    entity.x = this.tempPos.x;
    entity.y = this.tempPos.y;
  }

  resolveObstacleCollisions(entity) {
    const nearby = this.grid.getNearby(entity);
    for (const other of nearby) {
      if (other.type === "obstacle_wall") {
        const hasCollision = CollisionLogic.resolveObstacleCollision(
          entity.x,
          entity.y,
          entity.radius,
          other,
          this.tempPos,
          this.tempPushVector
        );
        if (hasCollision) {
          entity.x = this.tempPos.x;
          entity.y = this.tempPos.y;
        }
      }
    }
  }

  resolveEntityCollisions(worldState) {
    for (const player of worldState.players.values()) {
      if (player.isDead) continue;
      const nearby = this.grid.getNearby(player);

      for (const target of nearby) {
        if (target === player) continue;
        if (target.type === "player" || target.type === "enemy") {
          if (target.isDead) continue;
          if (target.type === "player" && player.id > target.id) continue;

          const hasCollision = CollisionLogic.resolveEntityOverlap(
            player.x,
            player.y,
            player.radius,
            target.x,
            target.y,
            target.radius,
            this.tempPushVector
          );

          if (hasCollision) {
            player.x += this.tempPushVector.x;
            player.y += this.tempPushVector.y;
            target.x -= this.tempPushVector.x;
            target.y -= this.tempPushVector.y;

            this.resolveObstacleCollisions(player);
            this.resolveObstacleCollisions(target);
          }
        }
      }
    }
  }

  updateBullets(worldState) {
    for (let i = worldState.bullets.length - 1; i >= 0; i--) {
      const b = worldState.bullets[i];

      // ★追加: EPアイテム以外は移動させる
      if (b.type !== BulletType.ITEM_EP) {
        b.x += b.vx;
        b.y += b.vy;
      }

      // 画面外判定
      if (
        b.x < 0 ||
        b.x > this.worldWidth ||
        b.y < 0 ||
        b.y > this.worldHeight
      ) {
        worldState.bullets.splice(i, 1);
        continue;
      }

      let hit = false;

      const nearby = this.grid.getNearby(b);
      for (const target of nearby) {
        if (target.type === "obstacle_wall") {
          // 障害物との衝突判定
          const hasCollision = CollisionLogic.resolveObstacleCollision(
            b.x,
            b.y,
            b.radius,
            target,
            null,
            this.tempPushVector
          );
          if (hasCollision) {
            hit = true;
            break;
          }
        } else if ((target.type === "player" || target.type === "enemy") && target.hp !== undefined) {
          if (target.isDead) continue;
          if (b.ownerId === target.id) continue;

          const isEnemyBullet = (b.type === "enemy" || b.type === BulletType.ENEMY);
          if (isEnemyBullet && target.type === "enemy") {
            continue; // 判定をスキップ
          }
          const distSq = CollisionLogic.getDistanceSq(
            b.x,
            b.y,
            target.x,
            target.y
          );
          const hitRadius = b.radius + target.radius;

          if (distSq < hitRadius * hitRadius) {
            
            // ★追加: アイテム取得処理
            if (b.type === BulletType.ITEM_EP) {
              if (target.type === "player") {
                // ItemLogicを使用してEP回復計算 (上限100)
                const newEp = ItemLogic.calculateRecoveredEp(target.ep, 10);
                if (newEp !== target.ep) {
                  target.ep = newEp;
                  target.isDirty = true;
                }

                // 取得エフェクト
                worldState.frameEvents.push({
                  type: "hit",
                  x: b.x,
                  y: b.y,
                  color: "#00ff00",
                });
                
                hit = true; // 衝突扱いにして消滅させる
              }
            } 
            // 通常弾の処理
            else {
              target.hp -= b.damage;
              worldState.frameEvents.push({
                type: "hit",
                x: b.x,
                y: b.y,
                color: b.type === "enemy" ? "#ff0000" : "#00ffff",
              });
              hit = true;

              if (target.hp <= 0) {
                worldState.frameEvents.push({
                  type: "explosion",
                  x: target.x,
                  y: target.y,
                  color: "#ffffff",
                });
                if (target.type === "player") target.isDead = true;
                else if (target.type === "enemy") {
                  const index = worldState.enemies.indexOf(target);
                  if (index > -1) worldState.enemies.splice(index, 1);
                }
              }
            }
            
            if (hit) break;
          }
        }
      }

      if (hit) {
        worldState.bullets.splice(i, 1);
      }
    }
  }
}