export const EnemySkins = {
  heavyTank: () => {
    return (ctx, w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      const mainColor = "#f44336";
      const glowColor = "#ff5252";
      const darkColor = "#3c0808";
      ctx.translate(cx, cy);
      ctx.fillStyle = darkColor;
      ctx.strokeStyle = mainColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const size = 25;
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const px = Math.cos(angle) * size;
        const py = Math.sin(angle) * size * 0.8;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = glowColor;
      ctx.fillRect(-28, -10, 6, 6);
      ctx.fillRect(-28, 4, 6, 6);
      ctx.fillStyle = "#1a0505";
      ctx.beginPath();
      ctx.moveTo(5, -8);
      ctx.lineTo(25, -5);
      ctx.lineTo(25, 5);
      ctx.lineTo(5, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(25, -3);
      ctx.lineTo(45, 0);
      ctx.lineTo(25, 3);
      ctx.stroke();
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "#ffeb3b";
      ctx.beginPath();
      ctx.arc(5, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#ffeb3b";
      ctx.beginPath();
      ctx.arc(5, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = mainColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(15, -15);
      ctx.lineTo(25, -25);
      ctx.moveTo(15, 15);
      ctx.lineTo(25, 25);
      ctx.stroke();
    };
  },
};
