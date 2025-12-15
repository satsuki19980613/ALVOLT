// src_v2/application/services/ScreenLayoutService.js
import { ClientConfig } from "../../core/config/ClientConfig.js";

/**
 * 画面サイズ、スケーリング、キャンバスのリサイズを管理するサービス
 */
export class ScreenLayoutService {
  /**
   * @param {ScreenScaler} screenScaler 
   * @param {PixiRenderer} pixiRenderer 
   * @param {Object} canvases - { chart, radar, magazine }
   */
  constructor(screenScaler, pixiRenderer, canvases) {
    this.screenScaler = screenScaler;
    this.pixiRenderer = pixiRenderer;
    this.canvases = canvases; // { chartCanvas, radarCanvas, magazineCanvas }
    
    this.gameScale = 1.0;
    this.cachedUiScale = 1.0;
  }

  /**
   * 画面リサイズ処理を実行し、スケール値を更新する
   */
  resize() {
    // スケーラーの更新
    if (this.screenScaler) {
      this.screenScaler.updateScale();
    }

    const container = document.getElementById("cockpit-container");
    if (!container) return;

    // ビューポートサイズの取得
    let width, height;
    if (window.visualViewport) {
      width = window.visualViewport.width;
      height = window.visualViewport.height;
    } else {
      width = window.innerWidth;
      height = window.innerHeight;
    }

    // 縦横比の補正（ランドスケープ強制などがあれば）
    if (height > width) {
      const temp = width;
      width = height;
      height = temp;
    }

    // コンテナサイズ適用
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;

    // UIスケールの取得
    let uiScale = 1;
    try {
      const val = getComputedStyle(document.body).getPropertyValue("--ui-scale");
      if (val) uiScale = parseFloat(val);
    } catch (e) {}
    if (!uiScale || isNaN(uiScale)) uiScale = 1;
    this.cachedUiScale = uiScale;

    // ゲームスケール（ワールド座標系への変換比率）の計算
    const targetWorldWidth = ClientConfig.GRID_SIZE * ClientConfig.VIEWPORT_GRID_WIDTH;
    this.gameScale = width / targetWorldWidth;

    // PIXIレンダラーのリサイズ
    if (this.pixiRenderer) {
      this.pixiRenderer.resize(width, height);
    }

    // サブキャンバスのリサイズ
    this._resizeSubCanvas(this.canvases.chartCanvas, uiScale);
    this._resizeSubCanvas(this.canvases.radarCanvas, uiScale);
    this._resizeSubCanvas(this.canvases.magazineCanvas, uiScale);
  }

  _resizeSubCanvas(canvas, uiScale) {
    if (canvas && canvas.parentElement) {
      const w = canvas.parentElement.clientWidth;
      const h = canvas.parentElement.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      if (w > 0 && h > 0) {
        canvas.width = Math.floor(w * dpr * uiScale);
        canvas.height = Math.floor(h * dpr * uiScale);

        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;

        const ctx = canvas.getContext("2d");
        if (ctx) ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
    }
  }
}