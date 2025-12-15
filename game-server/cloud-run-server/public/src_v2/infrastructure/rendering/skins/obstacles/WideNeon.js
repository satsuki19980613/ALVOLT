export const WideNeonSkin = (progress) => {
  return (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    ctx.translate(cx, cy);
    ctx.fillStyle = '#252629';
    ctx.fillRect(-w/2, -h/2, w, h);
    ctx.strokeStyle = '#0ab9fc';
    ctx.lineWidth = 3;
    ctx.strokeRect(-w/2, -h/2, w, h);
  };
};
