import { AILogic } from "../../logic/AILogic.js";
import { EnemyState } from "../../domain/EnemyState.js";
import { BulletState } from "../../domain/BulletState.js";

export class EnemySystem {
  constructor(game) {
    this.game = game;
    this.SEARCH_RADIUS = 500;
    this.tempShootResult = { shouldShoot: false, angle: 0, nextCooldown: 0 };
  }

  update() {
    this.game.worldState.enemies.forEach((enemy) => {
      this.updateEnemyAI(enemy);
    });
  }

  updateEnemyAI(enemy) {
    const player = AILogic.findClosestPlayer(
      enemy,
      this.game.worldState.players,
      this.SEARCH_RADIUS
    );

    enemy.moveTimer--;
    if (enemy.moveTimer <= 0) {
      enemy.targetAngle = AILogic.decideTargetAngle(enemy, player);
      enemy.moveTimer = 60;
    }

    enemy.vx = Math.cos(enemy.targetAngle) * enemy.speed;
    enemy.vy = Math.sin(enemy.targetAngle) * enemy.speed;

    if (enemy.vx !== 0 || enemy.vy !== 0) {
      enemy.isDirty = true;
    }

    enemy.shootCooldown--;
    if (enemy.shootCooldown <= 0) {
      AILogic.shouldShoot(enemy, player, this.tempShootResult);

      const shouldShoot = this.tempShootResult.shouldShoot;
      const angle = this.tempShootResult.angle;
      const nextCooldown = this.tempShootResult.nextCooldown;

      if (shouldShoot) {
        this.spawnEnemyBullet(enemy, angle);
      }
      enemy.shootCooldown = nextCooldown;
    }
  }
  spawnEnemyBullet(enemy, angle) {
    const bullet = new BulletState(
      enemy.x,
      enemy.y,
      6,
      angle,
      5,
      "enemy",
      10,
      enemy.id
    );
    this.game.addBullet(bullet);
  }

  spawnEnemy() {
    const margin = 50;
    const x =
      Math.random() * (this.game.worldState.width - margin * 2) + margin;
    const y =
      Math.random() * (this.game.worldState.height - margin * 2) + margin;

    const enemy = new EnemyState(
      x,
      y,
      this.game.worldState.width,
      this.game.worldState.height
    );
    enemy.id = `e_${this.game.worldState.enemyIdCounter++}`;

    this.game.worldState.enemies.push(enemy);
  }
}
