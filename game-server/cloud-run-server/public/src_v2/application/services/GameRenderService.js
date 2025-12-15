// src_v2/application/services/GameRenderService.js

/**
 * ゲーム内の各レンダラーへの描画命令とカメラ更新を管理するサービス
 */
export class GameRenderService {
  /**
   * @param {PixiRenderer} pixiRenderer 
   * @param {Object} renderers - { chart, radar, magazine }
   * @param {InputManager} inputManager 
   * @param {DomManipulator} uiManipulator 
   * @param {Object} canvases - { chart, radar, magazine }
   */
  constructor(pixiRenderer, renderers, inputManager, uiManipulator, canvases) {
    this.pixiRenderer = pixiRenderer;
    this.chartRenderer = renderers.chartRenderer;
    this.radarRenderer = renderers.radarRenderer;
    this.magazineRenderer = renderers.magazineRenderer;
    this.inputManager = inputManager;
    this.uiManipulator = uiManipulator;
    this.canvases = canvases;
  }

  /**
   * カメラ位置の更新とマウスワールド座標の計算
   * @param {VisualPlayer} myPlayer 
   * @param {number} gameScale 
   */
  updateCamera(myPlayer, gameScale) {
    if (!myPlayer) return;

    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;

    const mouseState = this.inputManager.mousePos;
    
    // マウスのワールド座標変換
    this.inputManager.mouseWorldPos.x =
      (mouseState.x - screenCenterX) / gameScale + myPlayer.x;
    this.inputManager.mouseWorldPos.y =
      (mouseState.y - screenCenterY) / gameScale + myPlayer.y;

    // PIXIカメラの更新
    this.pixiRenderer.updateCamera(myPlayer.x, myPlayer.y, gameScale);
  }

  /**
   * HUDおよびサブビューの描画を実行
   * @param {VisualPlayer} myPlayer 
   * @param {Object} tradeState 
   * @param {Object} visualState 
   * @param {number} uiScale 
   */
  renderSubViews(myPlayer, tradeState, visualState, uiScale) {
    if (!myPlayer) return;

    // HUD(HTML)更新
    this.uiManipulator.updateHUD(myPlayer, tradeState);

    // チャート描画
    if (this.canvases.chartCanvas) {
      const ctx = this.canvases.chartCanvas.getContext("2d");
      ctx.clearRect(0, 0, this.canvases.chartCanvas.width, this.canvases.chartCanvas.height);
      this.chartRenderer.draw(
        ctx,
        this.canvases.chartCanvas.width,
        this.canvases.chartCanvas.height,
        tradeState,
        myPlayer,
        uiScale
      );
    }

    // レーダー描画
    if (this.canvases.radarCanvas) {
      const ctx = this.canvases.radarCanvas.getContext("2d");
      ctx.clearRect(0, 0, this.canvases.radarCanvas.width, this.canvases.radarCanvas.height);
      this.radarRenderer.draw(
        ctx,
        this.canvases.radarCanvas.width,
        this.canvases.radarCanvas.height,
        3000, // World Width
        3000, // World Height
        myPlayer,
        Array.from(visualState.enemies.values()),
        Array.from(visualState.obstacles.values()),
        Array.from(visualState.players.values()),
        uiScale
      );
    }

    // マガジン描画
    if (this.canvases.magazineCanvas) {
      const ctx = this.canvases.magazineCanvas.getContext("2d");
      ctx.clearRect(0, 0, this.canvases.magazineCanvas.width, this.canvases.magazineCanvas.height);
      this.magazineRenderer.draw(
        ctx,
        myPlayer,
        this.canvases.magazineCanvas.width,
        this.canvases.magazineCanvas.height,
        uiScale
      );
    }
  }
}