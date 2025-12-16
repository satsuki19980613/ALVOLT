export class ChartRenderer {
  draw(ctx, canvasWidth, canvasHeight, tradeState, playerState, uiScale = 1.0){
    const dpr = window.devicePixelRatio || 1;

    const ratio = dpr * uiScale;

    const chartData = tradeState.chartData || [];
    const currentPrice = tradeState.currentPrice || 1000;
    let minPrice = tradeState.minPrice || 990;
    let maxPrice = tradeState.maxPrice || 1010;

    if (chartData.length < 2) return;
    const padding = {
      top: 10 * ratio,
      right: 50 * ratio,
      bottom: 5 * ratio,
      left: 0,
    };
    const chartX = padding.left;
    const chartY = padding.top;
    const chartWidth = canvasWidth - padding.left - padding.right;
    const chartHeight = canvasHeight - padding.top - padding.bottom;

    const visibleData = chartData;
    let priceRange = maxPrice - minPrice;
    if (priceRange === 0) priceRange = 1;

    const margin = priceRange * 0.1;
    maxPrice += margin;
    minPrice -= margin;
    const renderRange = maxPrice - minPrice;

    const px = (val) => Math.floor(val) + 0.5;
    const getX = (index) =>
      chartX + (index / (visibleData.length - 1)) * chartWidth;
    const getY = (price) =>
      chartY + chartHeight - ((price - minPrice) / renderRange) * chartHeight;

    ctx.beginPath();
    ctx.moveTo(px(getX(0)), px(getY(visibleData[0])));
    for (let i = 1; i < visibleData.length; i++) {
      ctx.lineTo(px(getX(i)), px(getY(visibleData[i])));
    }

    const lastPrice = visibleData[visibleData.length - 1];
    const firstPrice = visibleData[0];

    ctx.strokeStyle = lastPrice >= firstPrice ? "#00ff00" : "#ff0055";
    ctx.lineWidth = 3.2;

    ctx.stroke();

    const maColors = {
      short: "#00e1ff",
      medium: "#e1ff00",
      long: "#ff00e1",
    };
    ["short", "medium", "long"].forEach((type) => {
      const el = document.getElementById(`ma-${type}`);
      if (el && !el.checked) return;
      const maList = tradeState.maData[type];
      if (!maList || maList.length === 0) return;

      ctx.beginPath();
      ctx.strokeStyle = (maColors[type] || "#ffffff") + "80";
      ctx.lineWidth = 1.5;

      let maStarted = false;
      for (let i = 0; i < visibleData.length; i++) {
        const offsetFromEnd = visibleData.length - 1 - i;
        const maIndex = maList.length - 1 - offsetFromEnd;

        if (maIndex < 0) continue;
        const val = maList[maIndex];

        if (val === null || val === undefined) {
          maStarted = false;
          continue;
        }

        const x = getX(i);
        const y = getY(val);

        if (!maStarted) {
          ctx.moveTo(px(x), px(y));
          maStarted = true;
        } else {
          ctx.lineTo(px(x), px(y));
        }
      }
      ctx.stroke();
    });

    const currentY = getY(currentPrice);
    ctx.beginPath();
    ctx.setLineDash([5 * dpr, 5 * dpr]);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.moveTo(px(chartX), px(currentY));
    ctx.lineTo(px(chartX + chartWidth), px(currentY));
    ctx.stroke();
    ctx.setLineDash([]);

    if (playerState && playerState.chargePosition) {
      const entryPrice = playerState.chargePosition.entryPrice;
      const type = playerState.chargePosition.type || "long";
      const isShort = type === "short";
      const entryY = getY(entryPrice);

      ctx.beginPath();
      const color = isShort ? "#ff0055" : "#00ff00";
      const mark = isShort ? "▼" : "▲";

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([4 * dpr, 4 * dpr]);

      ctx.moveTo(px(chartX), px(entryY));
      ctx.lineTo(px(chartX + chartWidth), px(entryY));
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = color;
      ctx.font = `bold ${12 * ratio}px sans-serif`;

      const labelText = `${mark} ${isShort ? "SHORT ENTRY" : "LONG ENTRY"}`;
      ctx.fillText(labelText, chartX + 5 * ratio, entryY - 5 * ratio);

      ctx.textAlign = "right";
      ctx.fillText(mark, chartX + chartWidth - 5 * ratio, entryY - 5 * ratio);
      ctx.textAlign = "left";
    }

    ctx.font = `bold ${14 * ratio}px "Orbitron", sans-serif`;
    const priceText = currentPrice.toFixed(0);
    const textHeight = 14 * ratio;
    const textX = canvasWidth - 5 * ratio; 
    
    const textY = Math.max(
      chartY + textHeight / 2,
      Math.min(currentY, chartY + chartHeight - textHeight / 2)
    );
    
    ctx.save();
    ctx.fillStyle =
      lastPrice >= (chartData[chartData.length - 2] || 0)
        ? "#00ff00"
        : "#ff0055";
        
    ctx.textAlign = "right"; // ← 「右揃え」に変更（右端から左に向かって文字を書く）
    ctx.textBaseline = "middle";
    ctx.fillText(priceText, textX, textY);
    ctx.restore();
  }
}
