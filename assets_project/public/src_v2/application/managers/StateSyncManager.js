import { VisualPlayer } from "../../domain/view_models/VisualPlayer.js";
import { StateInterpolator } from "../services/StateInterpolator.js";
import { ClientConfig } from "../../core/config/ClientConfig.js";

export class StateSyncManager {
  constructor(userId) {
    this.userId = userId;
    this.visualState = {
      players: new Map(),
      enemies: new Map(),
      bullets: new Map(),
      obstacles: new Map(),
      effects: [],
    };
    this.effectQueue = [];

    this.interpolator = new StateInterpolator();
  }

  applySnapshot(snapshot) {
    if (!snapshot) return;
    this.visualState.players.clear();
    this.visualState.enemies.clear();
    this.visualState.bullets.clear();

    if (snapshot.players) {
      snapshot.players.forEach((p) => {
        const vp = new VisualPlayer(p.i, p.x, p.y);
        this.updatePlayerModel(vp, p);
        if (p.i === this.userId) vp.isMe = true;
        this.visualState.players.set(p.i, vp);
      });
    }
    if (snapshot.enemies) {
      snapshot.enemies.forEach((e) => {
        const ve = {
          id: e.i,
          x: e.x,
          y: e.y,
          hp: e.h,
          targetAngle: e.ta,
          type: "enemy",
        };
        this.visualState.enemies.set(e.i, ve);
      });
    }
    if (snapshot.bullets) {
      snapshot.bullets.forEach((b) => {
        const vb = { id: b.i, x: b.x, y: b.y, angle: b.a, type: b.t };
        this.visualState.bullets.set(b.i, vb);
      });
    }
  }

  applyDelta(delta) {
    if (!delta) return;

    if (delta.events) {
      delta.events.forEach((ev) => {
        let effectKey = null;

        if (ev.type === "hit" || ev.type === "explosion") {
          if (ev.color === "#ff0000" || ev.color === "#ffffff") {
            effectKey = "hit_fireball";
          } else {
            effectKey = "hit_orb";
          }
        }

        if (ev.color === "#00ff00" && ev.type === "hit") {
        }

        if (effectKey) {
          this.effectQueue.push({
            key: effectKey,
            x: ev.x,
            y: ev.y,
            rotation: Math.random() * Math.PI * 2,
          });
        }
      });
    }
    if (delta.removed) {
      delta.removed.players.forEach((id) =>
        this.visualState.players.delete(id)
      );
      delta.removed.enemies.forEach((id) =>
        this.visualState.enemies.delete(id)
      );
      delta.removed.bullets.forEach((id) =>
        this.visualState.bullets.delete(id)
      );
    }

    if (delta.updated) {
      if (delta.updated.players) {
        delta.updated.players.forEach((pState) => {
          let p = this.visualState.players.get(pState.i);
          if (!p) {
            p = new VisualPlayer(pState.i, pState.x, pState.y);
            if (pState.i === this.userId) p.isMe = true;
            this.visualState.players.set(pState.i, p);
          }
          this.updatePlayerModel(p, pState);

          if (!p.isDead && pState.d) {
          }
        });
      }
      if (delta.updated.enemies) {
        delta.updated.enemies.forEach((eState) => {
          let e = this.visualState.enemies.get(eState.i);
          if (!e) {
            e = {
              id: eState.i,
              x: eState.x,
              y: eState.y,
              hp: eState.h,
              targetAngle: eState.ta,
              type: "enemy",
            };
            this.visualState.enemies.set(eState.i, e);
          }
          const ESTIMATED_SPEED_ENEMY = 1.5;
          const predFactor = ClientConfig.PREDICTION_FACTOR || 15.0;

          e.targetX =
            eState.x + Math.cos(eState.ta) * ESTIMATED_SPEED_ENEMY * predFactor;

          e.targetY =
            eState.y + Math.sin(eState.ta) * ESTIMATED_SPEED_ENEMY * predFactor;

          e.hp = eState.h;
          e.targetAngle = eState.ta;
        });
      }
      if (delta.updated.bullets) {
        delta.updated.bullets.forEach((bState) => {
          let b = this.visualState.bullets.get(bState.i);
          if (!b) {
            b = {
              id: bState.i,
              x: bState.x,
              y: bState.y,
              angle: bState.a,
              type: bState.t,
            };
            this.visualState.bullets.set(bState.i, b);
          }
          b.targetX = bState.x;
          b.targetY = bState.y;
          b.angle = bState.a;
        });
      }
    }
  }

  updatePlayerModel(vp, state) {
    const ESTIMATED_SPEED = 4.5;
    const angle = state.a;

    const predFactor = ClientConfig.PREDICTION_FACTOR || 12.0;

    const predictedX = state.x + Math.cos(angle) * ESTIMATED_SPEED * predFactor;
    const predictedY = state.y + Math.sin(angle) * ESTIMATED_SPEED * predFactor;

    vp.targetX = predictedX;
    vp.targetY = predictedY;

    vp.hp = state.h;
    vp.ep = state.e;
    vp.name = state.n;

    vp.targetAimAngle = state.a;
    vp.targetTurretAngle = state.ta;
    vp.isDead = !!state.d;
    vp.chargeBetAmount = state.ba;
    vp.stockedBullets = state.sb || [];

    if (state.cp) {
      vp.chargePosition = {
        entryPrice: state.cp.ep,
        amount: state.cp.a,
        type: state.cp.t,
      };
    } else {
      vp.chargePosition = null;
    }
  }
  setStaticState(staticData) {
    if (!staticData || !staticData.obstacles) return;
    this.visualState.obstacles.clear();
    staticData.obstacles.forEach((obs) => {
      const id = obs.id || `${obs.x},${obs.y}`;
      const vo = {
        id: id,
        x: obs.x,
        y: obs.y,
        width: obs.width,
        height: obs.height,
        styleType: obs.className || "default",
        rotation: obs.rotation || 0,
        type: "obstacle",
      };
      this.visualState.obstacles.set(id, vo);
    });
  }

  updateInterpolation(dt) {
    this.interpolator.update(this.visualState, dt);
  }
}
