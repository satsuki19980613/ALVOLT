export class MagazineRenderer {
  constructor() {
    // キャッシュ用のオフスクリーンCanvasを作成
    this.staticCanvas = document.createElement("canvas");
    this.staticCtx = this.staticCanvas.getContext("2d");

    // キャッシュの有効性を判定するための状態保持
    this.cachedState = {
      width: 0,
      height: 0,
      uiScale: 0,
      maxStock: 0,
    };
  }

  draw(ctx, playerState, canvasWidth, canvasHeight, uiScale = 1.0) {
    if (!playerState) return;

    const maxStock = playerState.maxStock || 10;

    // --- 1. 静的レイヤー（枠・背景・線）のキャッシュ更新チェック ---
    if (
      this.cachedState.width !== canvasWidth ||
      this.cachedState.height !== canvasHeight ||
      this.cachedState.uiScale !== uiScale ||
      this.cachedState.maxStock !== maxStock
    ) {
      this.updateStaticCache(canvasWidth, canvasHeight, uiScale, maxStock);

      this.cachedState = {
        width: canvasWidth,
        height: canvasHeight,
        uiScale: uiScale,
        maxStock: maxStock,
      };
    }

    // --- 2. キャッシュされた静的レイヤーを描画 ---
    ctx.drawImage(this.staticCanvas, 0, 0);

    // --- 3. 動的レイヤー（弾丸）の描画 ---
    this.drawBullets(ctx, playerState, canvasWidth, canvasHeight, uiScale);
  }

  /**
   * 静的要素：サイバーパンク風の枠、グリッド背景、スロット番号などを描画
   */
  updateStaticCache(width, height, uiScale, maxStock) {
    this.staticCanvas.width = width;
    this.staticCanvas.height = height;

    const ctx = this.staticCtx;
    const dpr = window.devicePixelRatio || 1;
    const ratio = dpr * uiScale;

    // クリア
    ctx.clearRect(0, 0, width, height);

    // --- レイアウト定数 ---
    const paddingY = 10 * ratio;
    const paddingX = 8 * ratio;
    
    // 幅設定
    const customMagazineWidth = width * 0.65;
    
    const areaWidth = customMagazineWidth - paddingX * 2;
    // 中央寄せ
    const areaX = (width - areaWidth) / 2 - paddingX;
    const areaY = paddingY;
    const areaHeight = height - paddingY * 2;

    const gap = 4 * ratio; 
    const slotHeight = Math.floor(
      (areaHeight - gap * (maxStock - 1)) / maxStock
    );

    ctx.save();

    // 1. 背景
    ctx.fillStyle = "rgba(5, 10, 16, 0.14)";
    this._drawCyberRect(ctx, areaX, areaY, areaWidth, areaHeight, 10 * ratio);
    ctx.fill();

    // 2. 背景グリッド
    ctx.save();
    ctx.clip(); 
    this._drawGridPattern(ctx, areaX, areaY, areaWidth, areaHeight, ratio);
    ctx.restore();

    // 3. 外枠：ネオンシアンのグロー (shadowBlur削除)
    ctx.shadowColor = "#00f3ff";
    // ctx.shadowBlur = 8 * ratio; // 削除
    ctx.strokeStyle = "#00f3ff";
    ctx.lineWidth = 1 * ratio;
    this._drawCyberRect(ctx, areaX, areaY, areaWidth, areaHeight, 10 * ratio);
    ctx.stroke();
    
    // 発光リセット (削除)
    // ctx.shadowBlur = 0;

    // 4. スロット区切りと番号
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${7.5 * ratio}px "Orbitron", sans-serif`;

    for (let i = 0; i < maxStock; i++) {
      const currentSlotY = areaY + areaHeight - (i + 1) * (slotHeight + gap) + gap; 
      

      // スロット番号の描画 (左側に配置)
      const label = (i + 1).toString().padStart(2, '0');
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      
      // 文字位置
      ctx.fillText(label, areaX - 8 * ratio, currentSlotY + slotHeight / 2);
    }

    ctx.restore();
  }

  /**
   * 動的要素：発光する弾丸のみ描画（空スロットは描画しない）
   */
  drawBullets(ctx, playerState, canvasWidth, canvasHeight, uiScale) {
    const dpr = window.devicePixelRatio || 1;
    const ratio = dpr * uiScale;
    const stockedBullets = playerState.stockedBullets || [];
    const maxStock = playerState.maxStock || 10;

    const paddingY = 10 * ratio;
    const paddingX = 8 * ratio;
    
    // 幅設定
    const customMagazineWidth = canvasWidth * 0.65;
    
    const areaWidth = customMagazineWidth - paddingX * 2;
    const areaX = (canvasWidth - areaWidth) / 2 - paddingX;
    const areaY = paddingY;
    const areaHeight = canvasHeight - paddingY * 2;

    const gap = 4 * ratio;
    const slotHeight = Math.floor(
      (areaHeight - gap * (maxStock - 1)) / maxStock
    );

    const BASE_BULLET_WIDTH = 600;
    const BASE_BULLET_HEIGHT = 110;

    // --- 弾丸の基本スケール計算 ---
    // 左右の余白を 2.5% にして、2～9番を幅広に
    const bulletPaddingX = areaWidth * 0.025; 
    const bulletPaddingY = slotHeight * 0.1;
    
    const availableWidth = areaWidth - bulletPaddingX * 2;
    const availableHeight = slotHeight - bulletPaddingY * 2;

    const baseScaleX = availableWidth / BASE_BULLET_WIDTH;
    const baseScaleY = availableHeight / BASE_BULLET_HEIGHT;
    
    // X座標の中心
    const slotCenterX = areaX + areaWidth / 2;

    ctx.save();
    
    for (let i = 0; i < maxStock; i++) {
      // 弾丸がある場合のみ処理する
      if (i < stockedBullets.length) {
        const currentY = areaY + areaHeight - (i + 1) * (slotHeight + gap) + gap;
        const slotCenterY = currentY + slotHeight / 2;

        const bulletInfo = stockedBullets[i];
        const damageVal = typeof bulletInfo === "object" ? bulletInfo.damage : bulletInfo;

        // --- スケール調整 ---
        let currentScale = Math.min(baseScaleX, baseScaleY);

        // 1番目(0) と 10番目(maxStock-1) は角のために縮小する (0.75倍)
        if (i === 0 || i === maxStock - 1) {
          currentScale *= 0.8;
        }

        // --- 色の決定 ---
        let baseColor, coreColor, glowColor;
        if (damageVal >= 100) {
          baseColor = "#d500f9"; 
          coreColor = "#ff80ab";
          glowColor = "#ea80fc";
        } else if (damageVal >= 50) {
          baseColor = "#ff3d00";
          coreColor = "#ff9e80";
          glowColor = "#ff6e40";
        } else if (damageVal >= 25) {
          baseColor = "#00e676";
          coreColor = "#b9f6ca";
          glowColor = "#69f0ae";
        } else {
          baseColor = "#00bcd4";
          coreColor = "#e0f7fa";
          glowColor = "#84ffff";
        }

        ctx.save();
        ctx.translate(slotCenterX, slotCenterY);
        ctx.scale(-currentScale, currentScale);

        ctx.beginPath();
        this._drawBulletPath(ctx);

        const grad = ctx.createLinearGradient(-300, 0, 300, 0);
        grad.addColorStop(0, "transparent");
        grad.addColorStop(0.2, baseColor);
        grad.addColorStop(0.8, glowColor);
        grad.addColorStop(1, coreColor);

        ctx.fillStyle = grad;
        // スケールに応じてグローの強さを調整 (shadowBlur削除)
        ctx.shadowColor = baseColor;
        // ctx.shadowBlur = 15 * (currentScale / Math.min(baseScaleX, baseScaleY)); // 削除
        
        ctx.fill();

        ctx.strokeStyle = coreColor;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        ctx.stroke();
        


        ctx.restore();
      }
    }
    ctx.restore();
  }

  // --- ヘルパーメソッド (変更なし) ---
  _drawCyberRect(ctx, x, y, w, h, cutSize) {
    ctx.beginPath();
    ctx.moveTo(x + cutSize, y);
    ctx.lineTo(x + w - cutSize, y);
    ctx.lineTo(x + w, y + cutSize);
    ctx.lineTo(x + w, y + h - cutSize);
    ctx.lineTo(x + w - cutSize, y + h);
    ctx.lineTo(x + cutSize, y + h);
    ctx.lineTo(x, y + h - cutSize);
    ctx.lineTo(x, y + cutSize);
    ctx.lineTo(x + cutSize, y);
    ctx.closePath();
  }

  _drawGridPattern(ctx, x, y, w, h, ratio) {
    const gridSize = 20 * ratio;
    ctx.strokeStyle = "rgba(0, 243, 255, 0.1)";
    ctx.lineWidth = 0.4 * ratio;
    ctx.beginPath();

    for (let gx = x; gx <= x + w; gx += gridSize) {
        ctx.moveTo(gx, y);
        ctx.lineTo(gx, y + h);
    }
    for (let gy = y; gy <= y + h; gy += gridSize) {
        ctx.moveTo(x, gy);
        ctx.lineTo(x + w, gy);
    }
    ctx.stroke();
  }

  _drawBulletPath(ctx) {
    const totalLen = 600;
    const rimLen = 15;
    const grooveLen = 20;
    const bodyLen = 320;
    const shoulderLen = 40;
    const neckLen = 50;
    const bulletLen =
      totalLen - (rimLen + grooveLen + bodyLen + shoulderLen + neckLen);
    const rimRadius = 55;
    const grooveRadius = 45;
    const bodyRadius = 52;
    const neckRadius = 32;
    const startX = -(totalLen / 2);
    const centerY = 0;
    let currentX = startX;

    // 上半分
    ctx.moveTo(currentX, centerY - rimRadius);
    currentX += rimLen;
    ctx.lineTo(currentX, centerY - rimRadius);
    ctx.lineTo(currentX, centerY - grooveRadius);
    currentX += grooveLen;
    ctx.lineTo(currentX, centerY - grooveRadius);
    ctx.lineTo(currentX + 5, centerY - bodyRadius);
    currentX += 5;
    const actualBodyLen = bodyLen - 5;
    currentX += actualBodyLen;
    ctx.lineTo(currentX, centerY - bodyRadius);
    currentX += shoulderLen;
    ctx.lineTo(currentX, centerY - neckRadius);
    currentX += neckLen;
    ctx.lineTo(currentX, centerY - neckRadius);
    const tipX = startX + totalLen;
    const tipY = centerY;
    ctx.bezierCurveTo(
      currentX + bulletLen * 0.4,
      centerY - neckRadius,
      tipX - bulletLen * 0.1,
      centerY - neckRadius * 0.1,
      tipX,
      tipY
    );
    // 下半分
    ctx.bezierCurveTo(
      tipX - bulletLen * 0.1,
      centerY + neckRadius * 0.1,
      currentX + bulletLen * 0.4,
      centerY + neckRadius,
      currentX,
      centerY + neckRadius
    );
    currentX -= neckLen;
    ctx.lineTo(currentX, centerY + neckRadius);
    currentX -= shoulderLen;
    ctx.lineTo(currentX, centerY + bodyRadius);
    currentX -= actualBodyLen;
    ctx.lineTo(currentX, centerY + bodyRadius);
    currentX -= 5;
    ctx.lineTo(currentX, centerY + grooveRadius);
    currentX -= grooveLen;
    ctx.lineTo(currentX, centerY + grooveRadius);
    ctx.lineTo(currentX, centerY + rimRadius);
    currentX -= rimLen;
    ctx.lineTo(currentX, centerY + rimRadius);
    ctx.closePath();
  }
}