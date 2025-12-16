/**
 * Hexagon Fortress (アニメーション対応版・軽量化)
 * @param {number} progress 0.0 〜 1.0 のアニメーション進行度
 * @param {string} color テーマカラー
 */
export const HexagonFortressSkin = (progress, color = "#00ffea") => {
  return (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const size = (Math.min(w, h) / 2) * 0.85;

    // ポリゴン描画ヘルパー
    const drawPolygon = (g, x, y, r, sides) => {
      if (sides < 3) return;
      const a = (Math.PI * 2) / sides;
      const offset = -Math.PI / 2;
      g.moveTo(x + r * Math.cos(offset), y + r * Math.sin(offset));
      for (let i = 1; i < sides; i++) {
        g.lineTo(
          x + r * Math.cos(offset + a * i),
          y + r * Math.sin(offset + a * i)
        );
      }
      g.closePath();
    };

    const angleBase = progress * Math.PI * 2;
    const pulse = Math.sin(angleBase);
    const rapidPulse = Math.sin(angleBase * 4);

    ctx.translate(cx, cy);

    // 1. メインボディ
    // 背景のグロー表現 (lighter合成で代用)
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.2 + pulse * 0.1; // 脈動する透明度
    ctx.beginPath();
    drawPolygon(ctx, 0, 0, size, 6);
    ctx.fill();
    ctx.restore();

    // 本体の塗り
    ctx.fillStyle = "#1a1a24";
    ctx.beginPath();
    drawPolygon(ctx, 0, 0, size, 6);
    ctx.fill();

    // 枠線
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.stroke();

    // 2. 内部構造
    ctx.fillStyle = "#0f0f14";
    ctx.beginPath();
    drawPolygon(ctx, 0, 0, size * 0.75, 6);
    ctx.fill();

    ctx.strokeStyle = "#2a2a35";
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      const angle = ((Math.PI * 2) / 6) * i;
      ctx.moveTo(Math.cos(angle) * size * 0.3, Math.sin(angle) * size * 0.3);
      ctx.lineTo(Math.cos(angle) * size * 0.75, Math.sin(angle) * size * 0.75);
      ctx.stroke();
    }

    // 3. 回転リング
    ctx.save();
    ctx.rotate(angleBase);
    
    // リング本体
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    
    // リングの発光 (重ね描き)
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over"; // 合成モードを戻す
    ctx.globalAlpha = 1.0;

    // 装飾（白い点）
    for (let i = 0; i < 3; i++) {
      const a = ((Math.PI * 2) / 3) * i;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(Math.cos(a) * size * 0.55, Math.sin(a) * size * 0.55, 3, 0, Math.PI * 2);
      ctx.fill();
      
      // 点の周りの光
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * size * 0.55, Math.sin(a) * size * 0.55, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // 4. コア
    ctx.fillStyle = "#000";
    ctx.beginPath();
    drawPolygon(ctx, 0, 0, size * 0.3, 6);
    ctx.fill();

    // コアの発光
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.5 + rapidPulse * 0.3; // 素早く明滅
    ctx.beginPath();
    drawPolygon(ctx, 0, 0, size * 0.2, 6);
    ctx.fill();
    ctx.restore();

    // 中心点
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
  };
};