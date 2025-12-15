export const StandardCyberSkin = (progress) => {
  return (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    ctx.translate(cx, cy);
    ctx.fillStyle = '#2b2b30';
    ctx.fillRect(-w/2, -h/2, w, h);
    ctx.strokeStyle = '#fcee0a';
    ctx.lineWidth = 2;
    ctx.strokeRect(-w/2, -h/2, w, h);
  };
};
