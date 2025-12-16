export class DebugUiManager {
  constructor() {
    this.isDebugMode = false;
    this.panelEl = document.getElementById("debug-panel");
    this.statsEl = document.getElementById("debug-stats-container");
    this.simEl = document.getElementById("debug-simulation-container");
  }

  enable() {
    this.isDebugMode = true;
    if (this.panelEl) {
      this.panelEl.style.display = "block";
      this.setupJitterCanvas();
    }
  }

  setupJitterCanvas() {
    if (document.getElementById("debug-jitter-canvas")) return;

    const container = document.createElement("div");
    container.style.marginTop = "10px";
    
    const canvas = document.createElement("canvas");
    canvas.id = "debug-jitter-canvas";
    canvas.width = 300;
    canvas.height = 100;
    canvas.style.width = "100%";
    canvas.style.backgroundColor = "#222";
    canvas.style.border = "1px solid #555";

    const btn = document.createElement("button");
    btn.id = "btn-download-jitter";
    btn.textContent = "Download JSON";
    btn.className = "ui-button small";
    btn.style.marginTop = "5px";
    btn.style.width = "100%";

    container.appendChild(canvas);
    container.appendChild(btn);
    this.panelEl.appendChild(container);
  }

  setupListeners(onDownload) {
    const btn = document.getElementById("btn-download-jitter");
    if (btn) btn.addEventListener("click", onDownload);
  }

  getCanvas() {
    return document.getElementById("debug-jitter-canvas");
  }

  update(stats, simStats, serverStats) {
    if (!this.isDebugMode || !this.statsEl) return;

    let statsHtml = `<p><span class="stat-key">PPS:</span> <span class="stat-value">${stats.pps_total}</span></p>`;
    
    if (stats.jitter !== undefined) {
      const jitterVal = stats.jitter.toFixed(2);
      const color = stats.jitter > 10.0 ? "#f44336" : stats.jitter > 5.0 ? "#ffeb3b" : "#4caf50";
      statsHtml += `<p><span class="stat-key">Jitter:</span> <span class="stat-value" style="color:${color}">${jitterVal} ms</span></p>`;
    }
    statsHtml += `<hr><p><span class="stat-key">BPS:</span> <span class="stat-value">${(stats.bps_total / 1024).toFixed(1)} KB/s</span></p>`;
    
    this.statsEl.innerHTML = statsHtml;

    if (serverStats) {
       // サーバー統計のHTML生成（省略せず元のロジックをここに記述）
       // ...
    }
  }
}