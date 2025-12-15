export const LongCornerMagentaSkin = (progress) => {
  return (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const BASE_W = 320;
    const BASE_H = 220;
    ctx.save();
    ctx.translate(cx, cy);
    const scaleX = w / BASE_W;
    const scaleY = h / BASE_H;
    ctx.scale(scaleX, scaleY);
    ctx.fillStyle = '#252629';
    ctx.fillRect(-150, -100, 300, 200);
    ctx.strokeStyle = '#b82b5a';
    ctx.lineWidth = 4;
    ctx.strokeRect(-150, -100, 300, 200);
    ctx.restore();
  };
};
