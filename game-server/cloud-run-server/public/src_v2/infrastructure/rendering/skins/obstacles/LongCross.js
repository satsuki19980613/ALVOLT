export const LongCrossSkin = (progress) => {
  return (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const BASE_W = 240;
    const BASE_H = 360;
    ctx.save();
    ctx.translate(cx, cy);
    const scaleX = w / BASE_W;
    const scaleY = h / BASE_H;
    ctx.scale(scaleX, scaleY);
    ctx.fillStyle = '#252629';
    ctx.fillRect(-50, -150, 100, 300);
    ctx.fillRect(-100, -50, 200, 100);
    ctx.strokeStyle = '#eebd00';
    ctx.lineWidth = 2;
    ctx.strokeRect(-50, -150, 100, 300);
    ctx.strokeRect(-100, -50, 200, 100);
    ctx.restore();
  };
};
