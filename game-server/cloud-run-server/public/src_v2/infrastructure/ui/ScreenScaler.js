export class ScreenScaler {
  constructor() {
    this.BASE_WIDTH = 896;
    this.BASE_HEIGHT = 414;
  }

  init() {
    window.addEventListener("resize", () => this.updateScale());
    this.updateScale();
  }

  updateScale() {
    const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isMobile && window.innerWidth < 1024) {
      document.documentElement.style.setProperty("--ui-scale", "1");
      return;
    }

    let currentW = window.innerWidth;
    let currentH = window.innerHeight;
    if (currentH > currentW) {
      const temp = currentW;
      currentW = currentH;
      currentH = temp;
    }

    const scaleX = currentW / this.BASE_WIDTH;
    const scaleY = currentH / this.BASE_HEIGHT;
    let scale = Math.min(scaleX, scaleY);

    document.documentElement.style.setProperty("--ui-scale", scale);
  }
}