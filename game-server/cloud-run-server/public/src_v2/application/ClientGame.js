import { PixiRenderer } from "../infrastructure/rendering/pixi/PixiRenderer.js";
import { InputManager } from "../infrastructure/input/InputManager.js";
import { NetworkClient } from "../infrastructure/network/NetworkClient.js";
import { StateSyncManager } from "./managers/StateSyncManager.js";
import { MobileControlManager } from "../infrastructure/input/MobileControlManager.js";
import { ChartRenderer } from "../infrastructure/rendering/canvas/ChartRenderer.js";
import { RadarRenderer } from "../infrastructure/rendering/canvas/RadarRenderer.js";
import { MagazineRenderer } from "../infrastructure/rendering/canvas/MagazineRenderer.js";
import { DomManipulator } from "../infrastructure/ui/DomManipulator.js";
import { ScreenScaler } from "../infrastructure/ui/ScreenScaler.js";
import { ClientConfig } from "../core/config/ClientConfig.js";
import { JitterRecorder } from "../domain/debug/JitterRecorder.js";
import { DebugGraphRenderer } from "../domain/debug/DebugGraphRenderer.js";
import { GameNetworkEventHandler } from "./services/GameNetworkEventHandler.js";
import { ScreenLayoutService } from "./services/ScreenLayoutService.js";
import { GameRenderService } from "./services/GameRenderService.js";

export class ClientGame {
  constructor(uiManipulator) {
    this.renderer = new PixiRenderer("game-field");
    this.inputManager = new InputManager();
    this.network = new NetworkClient();
    this.uiManipulator = uiManipulator || new DomManipulator();
    this.screenScaler = new ScreenScaler();

    this.chartRenderer = new ChartRenderer();
    this.radarRenderer = new RadarRenderer();
    this.magazineRenderer = new MagazineRenderer();

    this.chartCanvas = document.getElementById("chart-canvas");
    this.radarCanvas = document.getElementById("radar-canvas");
    this.magazineCanvas = document.getElementById("magazine-canvas");
    this.cachedGameScale = 1.0;
    this.mobileControls = new MobileControlManager(this.inputManager);
    this.uiManipulator.setMobileControlManager(this.mobileControls);

    this.networkEventHandler = new GameNetworkEventHandler(this);

    this.layoutService = new ScreenLayoutService(
      this.screenScaler,
      this.renderer,
      {
        chartCanvas: this.chartCanvas,
        radarCanvas: this.radarCanvas,
        magazineCanvas: this.magazineCanvas,
      }
    );

    this.renderService = new GameRenderService(
      this.renderer,
      {
        chartRenderer: this.chartRenderer,
        radarRenderer: this.radarRenderer,
        magazineRenderer: this.magazineRenderer,
      },
      this.inputManager,
      this.uiManipulator,
      {
        chartCanvas: this.chartCanvas,
        radarCanvas: this.radarCanvas,
        magazineCanvas: this.magazineCanvas,
      }
    );

    this.syncManager = null;
    this.userId = null;
    this.tradeState = {
      chartData: [],
      currentPrice: 1000,
      minPrice: 990,
      maxPrice: 1010,
      maData: { short: [], medium: [], long: [] },
    };
    this.renderLoopId = null;
    this.inputIntervalId = null;
    this.lastFrameTime = 0;
    this.serverStats = null;
    this.lastRenderTime = 0;
    this.RENDER_INTERVAL = 100;
    this.jitterRecorder = null;
    this.debugGraphRenderer = null;
  }

  async init() {
    this.screenScaler.init();

    const updateScaleCache = () => {
      this.layoutService.resize();
      this.cachedGameScale = this.layoutService.gameScale || 1.0;
      this.cachedUiScale = this.layoutService.cachedUiScale || 1.0;
    };

    updateScaleCache();

    window.addEventListener("resize", () => updateScaleCache());

    await this.renderer.init();
    this.inputManager.init(document.getElementById("game-field"));

    this.renderer.setupBackground(3000, 3000);

    this.networkEventHandler.setup();
  }

  async connect(userId, userName, isDebug = false) {
    this.stopLoop();
    this.inputManager.resetActionStates();

    this.userId = userId;
    if (isDebug) {
      this.jitterRecorder = new JitterRecorder();
      this.debugGraphRenderer = new DebugGraphRenderer();
      setTimeout(() => {
        const canvas = this.uiManipulator.getDebugCanvas();
        if (canvas) this.debugGraphRenderer.setCanvas(canvas);

        this.uiManipulator.setupDebugListeners(() => {
          this.jitterRecorder.downloadJson();
        });
      }, 100);
    }

    this.syncManager = new StateSyncManager(this.userId);

    const joinData = await this.network.connect(
      this.userId,
      userName,
      isDebug,
      this.jitterRecorder
    );
    if (joinData && joinData.worldConfig) {
      this.renderer.setupBackground(
        joinData.worldConfig.width,
        joinData.worldConfig.height
      );
    }
  }

  startLoop() {
    this.stopLoop();
    this.lastFrameTime = performance.now();
    this.renderLoopId = requestAnimationFrame((t) => this.loop(t));
    this.inputIntervalId = setInterval(
      () => this.sendInput(),
      ClientConfig.INPUT_SEND_INTERVAL
    );
    this.mobileControls.applyScreenMode("game");

    this.layoutService.resize();
  }

  stopLoop() {
    if (this.renderLoopId) cancelAnimationFrame(this.renderLoopId);
    if (this.inputIntervalId) clearInterval(this.inputIntervalId);
    this.mobileControls.applyScreenMode("menu");
  }

  loop(now) {
    const dtSeconds = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;
    const deltaFrames = dtSeconds * 60;

    if (this.syncManager) {
      this.syncManager.updateInterpolation(deltaFrames);
      while (this.syncManager.effectQueue.length > 0) {
        const ef = this.syncManager.effectQueue.shift();
        this.renderer.playOneShotEffect(ef.key, ef.x, ef.y, ef.rotation);
      }

      const myPlayer = this.syncManager.visualState.players.get(this.userId);

      this.renderService.updateCamera(myPlayer, this.cachedGameScale);

      this.renderer.render(this.syncManager.visualState);

      if (this.uiManipulator.isDebugMode && this.debugGraphRenderer && this.jitterRecorder) {
        this.debugGraphRenderer.draw(this.jitterRecorder);
      }

      // 修正：時間制限(if文)を削除し、毎フレーム描画して滑らかにする
      if (myPlayer) {
        this.renderService.renderSubViews(
          myPlayer,
          this.tradeState,
          this.syncManager.visualState,
          this.layoutService.cachedUiScale
        );
      }
      this.lastRenderTime = now; // (念のため更新しておく)

      if (this.uiManipulator.isDebugMode && this.network) {
        const stats = this.network.getStats();
        this.uiManipulator.updateDebugHUD(stats, null, this.serverStats);
      }
    }

    this.renderLoopId = requestAnimationFrame((t) => this.loop(t));
  }

  sendInput() {
    const state = this.inputManager.getInputState();
    this.network.sendInput(0, state.states, state.pressed, state.mouseWorldPos);
  }
}
