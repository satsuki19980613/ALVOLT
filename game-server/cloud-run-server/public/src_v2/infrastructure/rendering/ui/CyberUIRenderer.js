import { SkinFactoryUI } from "./SkinFactoryUI.js";
import { InitialScene } from "./scenes/InitialScene.js";
import { HomeScene } from "./scenes/HomeScene.js";
import { ModalScene } from "./scenes/ModalScene.js";

export class CyberUIRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
    this.width = 0;
    this.height = 0;
    this.animationId = null;

    this.frame = 0;
    this.speed = 2;
    this.stars = [];
    this.glitchIntensity = 0;
    this.glitchTimer = 0;
    this.gridOffset = 0;
    this.colors = {
      bg: "#050505",
      cyan: "#00f3ff",
      pink: "#ff0055",
      purple: "#bc13fe",
      yellow: "#f9f002",
      white: "#ffffff",
    };
    this.skinFactory = new SkinFactoryUI();
    this.scenes = {
      initial: new InitialScene(this.skinFactory),
      home: new HomeScene(this.skinFactory),
      modal: new ModalScene(this.skinFactory),
    };
    this.currentScene = this.scenes.initial;
    this.overlayScene = null;
    this.mousePos = { x: 0, y: 0 };
    this.onAction = null;

    this.isWarping = false;
    this.warpStartTime = null;
    this.warpProgress = 0;
    this.onWarpComplete = null;

    this.scanlineCanvas = document.createElement("canvas");
    this.scanlineCtx = this.scanlineCanvas.getContext("2d");

    if (this.canvas) {
      this.setupEvents();
      this.resize();
      window.addEventListener("resize", () => this.resize());
    }
  }

  setOverlay(sceneKey) {
    if (sceneKey && this.scenes[sceneKey]) {
      this.overlayScene = this.scenes[sceneKey];
    } else {
      this.overlayScene = null;
    }
  }

  setScene(sceneKey, data = null) {
    if (this.scenes[sceneKey]) {
      this.currentScene = this.scenes[sceneKey];
      if (data && typeof this.currentScene.setUserState === "function") {
        this.currentScene.setUserState(data);
      }
    }
  }

  setCallback(fn) {
    this.onAction = fn;
  }

  setAudioState(isMuted) {
    if (
      this.currentScene &&
      typeof this.currentScene.setAudioState === "function"
    ) {
      this.currentScene.setAudioState(isMuted);
    }
  }

  setupEvents() {
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos.x = e.clientX - rect.left;
      this.mousePos.y = e.clientY - rect.top;
    });

    const handleInput = (clientX, clientY) => {
      if (this.isWarping) return;

      const rect = this.canvas.getBoundingClientRect();
      this.mousePos.x = clientX - rect.left;
      this.mousePos.y = clientY - rect.top;

      if (this.currentScene) {
        const actionId = this.currentScene.handleClick(
          this.mousePos.x,
          this.mousePos.y
        );
        if (actionId && this.onAction) {
          this.onAction(actionId);
        }
      }
    };

    this.canvas.addEventListener("mousedown", (e) => {
      handleInput(e.clientX, e.clientY);
    });

    this.canvas.addEventListener(
      "touchstart",
      (e) => {
        if (e.cancelable) e.preventDefault();
      },
      { passive: false }
    );

    // 【修正】入力確定は指を離した瞬間(touchend)に行う
    this.canvas.addEventListener(
      "touchend",
      (e) => {
        if (e.cancelable) e.preventDefault();
        const touch = e.changedTouches[0];
        // 指を離したタイミングであれば、Androidでもフルスクリーン権限が通りやすくなります
        handleInput(touch.clientX, touch.clientY);
      },
      { passive: false }
    );
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;

    this.scanlineCanvas.width = this.width;
    this.scanlineCanvas.height = this.height;
    this.updateScanlineCache();

    this.initStars();
  }

  startWarp(onComplete) {
    if (this.isWarping) return;
    this.isWarping = true;
    this.warpStartTime = performance.now();
    this.onWarpComplete = onComplete;
  }

  resetWarp() {
    this.isWarping = false;
    this.warpStartTime = null;
    this.warpProgress = 0;
    this.speed = 2;
    this.glitchIntensity = 0;
  }

  start() {
    if (!this.animationId) {
      this.resetWarp();
      this.animate();
    }
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.ctx) this.ctx.clearRect(0, 0, this.width, this.height);
  }

  initStars() {
    this.stars = [];
    for (let i = 0; i < 400; i++) {
      this.stars.push({
        x: this.random(-this.width * 1.5, this.width * 1.5),
        y: this.random(-this.height * 1.5, this.height * 1.5),
        z: this.random(1, 1000),
      });
    }
  }

  updateScanlineCache() {
    const ctx = this.scanlineCtx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    for (let i = 0; i < this.height; i += 4) {
      ctx.fillRect(0, i, this.width, 2);
    }
  }

  random(min, max) {
    return Math.random() * (max - min) + min;
  }

  updateGlitch() {
    if (this.glitchTimer > 0) {
      this.glitchTimer--;
      this.glitchIntensity = this.random(0, 10);
    } else {
      if (Math.random() < 0.02) {
        this.glitchTimer = this.random(5, 15);
      } else {
        this.glitchIntensity = 0;
      }
    }
  }

  drawGrid(cx, cy) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = this.colors.cyan;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    ctx.globalCompositeOperation = "lighter";

    this.gridOffset = (this.gridOffset + this.speed) % 40;
    const gridSize = 40;

    if (this.isWarping) ctx.globalAlpha = 0.1;

    ctx.beginPath();
    for (let x = -this.width; x <= this.width; x += gridSize * 2) {
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + x * 4, this.height * 1.5);
    }
    ctx.stroke();

    for (let i = 0; i < 20; i++) {
      const z = 200 + i * 40 - this.gridOffset;
      const yPos = cy + 20000 / z;
      if (yPos > this.height) continue;

      ctx.beginPath();
      ctx.moveTo(0, yPos);
      ctx.lineTo(this.width, yPos);
      ctx.globalAlpha = Math.min(1, (yPos - cy) / 200) * 0.5;
      ctx.stroke();
    }

    for (let i = 0; i < 20; i++) {
      const z = 200 + i * 40 - this.gridOffset;
      const yPos = cy - 20000 / z;
      if (yPos < 0) continue;

      ctx.beginPath();
      ctx.moveTo(0, yPos);
      ctx.lineTo(this.width, yPos);
      ctx.globalAlpha = Math.min(1, (cy - yPos) / 200) * 0.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  drawStars(cx, cy) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = this.colors.white;

    this.stars.forEach((star) => {
      star.z -= this.speed;
      if (star.z <= 0) {
        star.z = 1000;
        star.x = this.random(-this.width * 1.5, this.width * 1.5);
        star.y = this.random(-this.height * 1.5, this.height * 1.5);
      }

      const k = 500 / star.z;
      const x = star.x * k;
      const y = star.y * k;

      const size = (1 - star.z / 1000) * 3;

      if (this.speed > 50) {
        const prevK = 500 / (star.z + this.speed * 1.5);
        const prevX = star.x * prevK;
        const prevY = star.y * prevK;

        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, y);
        ctx.lineWidth = size;
        ctx.strokeStyle = this.colors.cyan;
        ctx.globalAlpha = Math.min(1, (this.speed - 50) / 100);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        if (x < -cx || x > cx || y < -cy || y > cy) return;

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
  }

  drawALV(cx, cy, scale) {
    const ctx = this.ctx;
    let shakeX = 0;
    let shakeY = 0;
    if (this.isWarping) {
      shakeX = this.random(-2, 2) * this.warpProgress * 5;
      shakeY = this.random(-2, 2) * this.warpProgress * 5;
      scale *= 1 - this.warpProgress;
    }
    if (scale <= 0.01) return;
    const size = 100 * scale;
    const baseShakeX = this.glitchIntensity > 0 ? this.random(-2, 2) : 0;
    const baseShakeY = this.glitchIntensity > 0 ? this.random(-2, 2) : 0;
    const drawPath = (color, offsetX, offsetY, isGlow) => {
      ctx.save();
      ctx.translate(
        cx + offsetX + baseShakeX + shakeX,
        cy + offsetY + baseShakeY + shakeY
      );
      ctx.strokeStyle = color;
      if (isGlow) {
        ctx.lineWidth = 8 * scale;
        ctx.globalAlpha = 0.3;
        ctx.lineJoin = "round";
        ctx.globalCompositeOperation = "lighter";
      } else {
        ctx.lineWidth = 3 * scale;
        ctx.globalAlpha = 1.0;
        ctx.lineJoin = "miter";
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.beginPath();
      ctx.moveTo(-size * 0.6, -size * 0.6);
      ctx.lineTo(-size * 0.6, size * 0.6);
      ctx.lineTo(0, size * 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * 0.6, size * 0.2);
      ctx.lineTo(0, -size * 0.8);
      ctx.lineTo(size * 0.6, size * 0.2);
      ctx.moveTo(-size * 0.3, -size * 0.2);
      ctx.lineTo(size * 0.3, -size * 0.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * 0.6, -size * 0.6);
      ctx.lineTo(0, size * 0.4);
      ctx.lineTo(size * 0.6, -size * 0.6);
      ctx.stroke();
      if (!isGlow) {
        ctx.fillStyle = this.isWarping ? this.colors.white : this.colors.yellow;
        ctx.beginPath();
        ctx.arc(0, -size * 0.8, 3 * scale, 0, Math.PI * 2);
        ctx.arc(-size * 0.6, size * 0.6, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };
    if (this.glitchIntensity > 0 || this.isWarping) {
      ctx.globalCompositeOperation = "screen";
      drawPath(this.colors.pink, -2, -2, false);
      drawPath(this.colors.cyan, 2, 2, false);
      ctx.globalCompositeOperation = "source-over";
    } else {
      drawPath(this.colors.cyan, 0, 0, true);
      drawPath(this.colors.white, 0, 0, false);
    }
  }

  drawText(cx, cy) {
    if (this.isWarping && this.warpProgress > 0.5) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = 'bold 40px "Orbitron", sans-serif';
    const text = "ALVOLT";
    const textY = cy + 80;
    const alpha = this.isWarping ? 1 - this.warpProgress * 2 : 1;
    if (alpha <= 0) {
      ctx.restore();
      return;
    }
    const offsetX = this.glitchIntensity > 0 ? this.random(-3, 3) : 0;
    if (this.glitchIntensity > 0) {
      ctx.globalAlpha = 0.7 * alpha;
      ctx.fillStyle = this.colors.pink;
      ctx.fillText(text, cx + offsetX + 2, textY + 2);
      ctx.fillStyle = this.colors.cyan;
      ctx.fillText(text, cx + offsetX - 2, textY - 2);
    }
    ctx.globalAlpha = 1.0 * alpha;
    ctx.fillStyle = this.colors.white;
    ctx.fillText(text, cx + offsetX, textY);
    ctx.restore();
  }

  drawRing(
    cx,
    cy,
    radius,
    color,
    rotationSpeed,
    segments,
    width,
    warpScale = 1.0
  ) {
    if (warpScale <= 0.01) return;

    const ctx = this.ctx;
    const r = radius * warpScale;

    ctx.save();
    ctx.translate(cx, cy);
    const rotation = this.frame * rotationSpeed * (this.isWarping ? 5 : 1);
    ctx.rotate(rotation);

    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = this.isWarping ? this.colors.white : color;

    ctx.globalAlpha = 0.8;
    ctx.lineWidth = width * warpScale;

    const step = (Math.PI * 2) / segments;
    const gap = 0.2;
    for (let i = 0; i < segments; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, r, i * step, (i + 1) * step - gap);
      ctx.stroke();
    }

    ctx.restore();
  }

  animate() {
    if (!this.ctx) return;

    let warpScale = 1.0;
    if (this.isWarping) {
      const duration = 2000;
      const now = performance.now();
      this.warpProgress = (now - this.warpStartTime) / duration;

      if (this.warpProgress < 1.0) {
        this.speed = 2 + Math.pow(this.warpProgress * 15, 3);
        this.glitchIntensity = this.warpProgress * 20;
        warpScale = 1 - this.warpProgress;
      } else {
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillRect(0, 0, this.width, this.height);
        if (this.onWarpComplete) {
          const cb = this.onWarpComplete;
          this.onWarpComplete = null;
          setTimeout(() => cb(), 100);
        }
        return;
      }
    } else {
      this.speed = 2;
      this.warpProgress = 0;
    }

    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = this.colors.bg;
    this.ctx.fillRect(0, 0, this.width, this.height);

    const cx = this.width / 2;

    const horizonY = Math.max(150, this.height * 0.35);

    this.updateGlitch();
    this.drawGrid(cx, horizonY);
    this.drawStars(cx, horizonY);

    this.drawRing(cx, horizonY, 130, this.colors.cyan, 0.005, 3, 2, warpScale);
    this.drawALV(cx, horizonY, 1.0);
    this.drawText(cx, horizonY);

    if (this.currentScene && !this.isWarping) {
      this.currentScene.render(
        this.ctx,
        this.width,
        this.height,
        this.mousePos
      );
    }

    if (this.overlayScene && !this.isWarping) {
      this.overlayScene.render(
        this.ctx,
        this.width,
        this.height,
        this.mousePos
      );
    }

    this.ctx.drawImage(this.scanlineCanvas, 0, 0);

    if (this.isWarping) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${this.warpProgress * 0.2})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }

    this.frame++;
    this.animationId = requestAnimationFrame(() => this.animate());
  }
}
