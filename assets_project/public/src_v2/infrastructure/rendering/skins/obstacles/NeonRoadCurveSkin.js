export const NeonRoadCurveSkin = (flipped) => {
  return (ctx, w, h) => {
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.fillText('Road Curve', 10, 20);
  };
};
