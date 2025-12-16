export class JitterRecorder {
  constructor(maxSamples = 600) { // 60fpsで約10秒分
    this.samples = [];
    this.maxSamples = maxSamples;
    this.startTime = Date.now();
  }

  addSample(jitterMs) {
    const timestamp = Date.now() - this.startTime;
    this.samples.push({ t: timestamp, v: jitterMs });

    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  getHistory() {
    return this.samples;
  }

  downloadJson() {
    const data = {
      recordedAt: new Date().toISOString(),
      totalSamples: this.samples.length,
      data: this.samples // {t: 経過時間ms, v: ジッターms}
    };

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `jitter_log_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}