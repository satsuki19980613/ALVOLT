export const UShapeHangarSkin = (progress) => {
  return (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    ctx.translate(cx, cy);
    ctx.fillStyle = '#252629';
    ctx.fillRect(-w/2, -h/2, w, h/3);
    ctx.fillRect(-w/2, -h/2, w/4, h);
    ctx.fillRect(w/4, -h/2, w/4, h);
    ctx.strokeStyle = '#00ff41';
    ctx.strokeRect(-w/2, -h/2, w, h);
  };
};
