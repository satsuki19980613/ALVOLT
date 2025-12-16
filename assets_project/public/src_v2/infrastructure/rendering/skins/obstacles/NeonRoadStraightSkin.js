export const NeonRoadStraightSkin = () => {
  return (ctx, w, h) => {
    const roadWidth = w * 0.8;
    const margin = (w - roadWidth) / 2;
    ctx.save();
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(margin, 0, roadWidth, h);
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 4;
    ctx.beginPath(); 
    ctx.moveTo(margin, 0); ctx.lineTo(margin, h); 
    ctx.stroke();
    ctx.beginPath(); 
    ctx.moveTo(w - margin, 0); ctx.lineTo(w - margin, h); 
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.setLineDash([20, 20]);
    ctx.beginPath();
    ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); 
    ctx.stroke();
    ctx.restore();
  };
};
