import { BaseScene } from "./BaseScene.js";

export class HomeScene extends BaseScene {
  constructor(skinFactory) {
    super(skinFactory);
    this.isGuest = true;
    this.userName = "Guest";
    this.isMuted = true;
    this.buttons = [];
  }

  /**
   * 状態をセットしてボタン構成を再構築
   */
  setUserState(userEntity) {
    this.isGuest = userEntity.isGuest;
    this.userName = userEntity.name || "Guest";
    this.rebuildButtons();
  }
  setAudioState(isMuted) {
    this.isMuted = isMuted;

    this.needsLayout = true;
  }

  rebuildButtons() {
    this.needsLayout = true;
  }
  updateLayout(cx, cy) {
    const width = cx * 2;
    const height = cy * 2;
    const btnW = 260;
    const btnH = 50;
    const gap = 15;

    this.buttons = [];
    this.buttons.push({
      id: "game_start",
      text: "JOIN GAME",
      w: btnW,
      h: btnH,
      active: true,
    });
    this.buttons.push({
      id: "open_ranking",
      text: "LEADERBOARD",
      w: btnW,
      h: btnH,
      active: false,
    });

    if (this.isGuest) {
      this.buttons.push({
        id: "open_transfer",
        text: "DATA TRANSFER",
        w: btnW,
        h: btnH,
        active: false,
      });
      this.buttons.push({
        id: "open_register",
        text: "REGISTER NAME",
        w: btnW,
        h: btnH,
        active: false,
      });
    } else {
      this.buttons.push({
        id: "open_transfer",
        text: "TRANSFER / ISSUE",
        w: btnW,
        h: btnH,
        active: false,
      });
      this.buttons.push({
        id: "menu_delete",
        text: "DELETE DATA",
        w: btnW,
        h: btnH,
        active: false,
      });
    }

    const bgmText = this.isMuted ? "BGM: OFF" : "BGM: ON";
    const bgmActive = !this.isMuted;
    this.buttons.push({
      id: "toggle_bgm",
      text: bgmText,
      w: btnW,
      h: btnH,
      active: bgmActive,
    });

    const totalButtons = this.buttons.length;
    const totalBtnHeight = totalButtons * btnH + (totalButtons - 1) * gap;

    const logoCenterY = Math.max(150, height * 0.35);

    const logoBottomLimit = logoCenterY + 130;

    let startY = height * 0.6;

    if (startY < logoBottomLimit) {
      startY = logoBottomLimit;
    }

    const marginBottom = 80;
    const limitBottom = height - marginBottom;

    if (startY + totalBtnHeight > limitBottom) {
      startY = limitBottom - totalBtnHeight;
      if (startY < logoBottomLimit) {
        startY = logoBottomLimit;
      }
    }

    this.buttons.forEach((btn, index) => {
      btn.x = cx - btn.w / 2;
      btn.y = startY + index * (btnH + gap);
    });

    this.needsLayout = false;
  }
  render(ctx, width, height, mousePos) {
    if (this.lastWidth !== width || this.lastHeight !== height) {
      this.needsLayout = true;
      this.lastWidth = width;
      this.lastHeight = height;
    }

    const cx = width / 2;
    const cy = height / 2;

    if (this.needsLayout) {
      this.updateLayout(cx, cy);
    }

    ctx.save();
    ctx.textAlign = "right";
    ctx.fillStyle = this.isGuest ? "#aaaaaa" : "#00ff00";
    ctx.font = "14px 'Orbitron'";
    ctx.fillText(`PILOT: ${this.userName}`, width - 20, 30);

    ctx.textAlign = "left";
    ctx.fillStyle = "#555";
    ctx.fillText(this.isGuest ? "STATUS: GUEST" : "STATUS: REGISTERED", 20, 30);
    ctx.restore();

    this.checkHover(mousePos.x, mousePos.y);
    this.buttons.forEach((btn) => {
      const img = this.skinFactory.getButton(
        btn.w,
        btn.h,
        btn.text,
        btn.active,
        btn.isHover
      );
      ctx.drawImage(img, btn.x - 10, btn.y - 10);
    });
  }
}
