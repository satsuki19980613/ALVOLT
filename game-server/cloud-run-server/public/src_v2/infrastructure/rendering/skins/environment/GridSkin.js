export const GridSkin = {
  drawTile: (color, lineWidth) => {
    return (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(w, 0);
      ctx.lineTo(w, h);
      ctx.moveTo(0, h);
      ctx.lineTo(w, h);
      ctx.stroke();
    };
  },
};
