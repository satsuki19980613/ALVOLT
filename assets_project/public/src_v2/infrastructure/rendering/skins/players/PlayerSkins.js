export const PlayerSkins = {
  chassis: (primaryColor) => {
    const secondaryColor = "#006064";
    return (ctx, w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      ctx.translate(cx, cy);
      ctx.fillStyle = secondaryColor;
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 2;
      const podW = 12;
      const podH = 40;
      const podX = 20;
      const drawPod = (xSign) => {
        ctx.beginPath();
        ctx.moveTo(xSign * podX, -podH * 0.8);
        ctx.lineTo(xSign * (podX + podW), -podH);
        ctx.lineTo(xSign * (podX + podW), podH);
        ctx.lineTo(xSign * podX, podH * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      };
      drawPod(-1);
      drawPod(1);
      ctx.fillStyle = "rgba(0, 20, 30, 0.9)";
      ctx.beginPath();
      ctx.moveTo(0, -30);
      ctx.lineTo(15, -10);
      ctx.lineTo(15, 20);
      ctx.lineTo(0, 30);
      ctx.lineTo(-15, 20);
      ctx.lineTo(-15, -10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(0, 8);
      ctx.moveTo(-8, 0);
      ctx.lineTo(8, 0);
      ctx.stroke();
    };
  },
  turret: (primaryColor) => {
    const secondaryColor = "#006064";
    const coreColor = "#ffffff";
    return (ctx, w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      ctx.translate(cx, cy);
      ctx.fillStyle = "#000";
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(4, -3, 35, 6);
      ctx.rect(4, -10, 25, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = secondaryColor;
      ctx.beginPath();
      ctx.moveTo(-10, -12);
      ctx.lineTo(10, -8);
      ctx.lineTo(15, 0);
      ctx.lineTo(10, 8);
      ctx.lineTo(-10, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = coreColor;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = coreColor;
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    };
  },
};
