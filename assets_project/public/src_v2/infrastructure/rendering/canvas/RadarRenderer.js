export class RadarRenderer {
  constructor() {
    // --- 1. 静的キャッシュ用のオフスクリーンCanvasを作成 ---
    this.staticCanvas = document.createElement("canvas");
    this.staticCtx = this.staticCanvas.getContext("2d");

    // キャッシュの状態管理
    this.cachedState = {
      width: 0,
      height: 0,
      uiScale: 0,
    };
  }

  draw(
    ctx,
    canvasWidth,
    canvasHeight,
    worldWidth,
    worldHeight,
    playerState,
    enemiesState,
    obstaclesState,
    otherPlayersState,
    uiScale = 1.0
  ) {
    const dpr = window.devicePixelRatio || 1;
    const ratio = dpr * uiScale;

    // --- 2. キャッシュの有効性チェックと更新 ---
    if (
      this.cachedState.width !== canvasWidth ||
      this.cachedState.height !== canvasHeight ||
      this.cachedState.uiScale !== uiScale
    ) {
      this.updateStaticCache(canvasWidth, canvasHeight, ratio);
      this.cachedState = {
        width: canvasWidth,
        height: canvasHeight,
        uiScale: uiScale,
      };
    }

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    // 短辺の85%をレーダーサイズとする
    const size = Math.min(canvasWidth, canvasHeight) * 0.85;
    const halfSize = size / 2;

    // 表示範囲（ワールド座標上の半径）
    const viewRadiusWorld = 1500;
    const scale = halfSize / viewRadiusWorld;
    
    // --- 3. 静的レイヤー（背景・グリッド・枠）の描画 ---
    ctx.drawImage(this.staticCanvas, 0, 0);

    // 矩形クリッピング開始（スキャンとブリップ用）
    ctx.save();
    ctx.beginPath();
    ctx.rect(centerX - halfSize, centerY - halfSize, size, size);
    ctx.clip();

    // --- 4. スキャンライン（動的） ---
    const time = Date.now() / 1000;
    const scanAngle = (time * Math.PI) % (Math.PI * 2); // 2秒で1回転

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(scanAngle);

    // レーダー色の定義 (Tactical Green)
    const rColor = "0, 255, 50"; 
    
    // スキャンセクター（扇形）の描画
    ctx.beginPath();
    ctx.moveTo(0, 0);
    // スキャンの残像（-45度）を描画したいが、四角い領域全体をカバーするために長めに描画
    // ここでは円弧を描き、クリッピングで四角く見せる
    const scanRadius = halfSize * 1.5; // 四隅まで届くように大きめに
    ctx.arc(0, 0, scanRadius, -Math.PI / 4, 0); 
    ctx.lineTo(0, 0);
    
    // スキャンのグラデーション
    const sweepGrad = ctx.createLinearGradient(0, -halfSize, 0, 0);
    sweepGrad.addColorStop(0, `rgba(${rColor}, 0)`);
    sweepGrad.addColorStop(1, `rgba(${rColor}, 0.25)`);
    
    ctx.fillStyle = `rgba(${rColor}, 0.15)`; // 全体的に薄く塗る
    ctx.fill();

    // スキャンの先端ライン
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(scanRadius, 0);
    ctx.strokeStyle = `rgba(${rColor}, 0.9)`;
    ctx.lineWidth = 0 * ratio;
    ctx.stroke();

    ctx.restore(); // 回転終了

    // --- 5. ターゲット（敵・他プレイヤー）の描画 ---
    if (!playerState) {
      ctx.restore(); // クリップ解除
      return;
    }

    const getRadarPos = (wx, wy) => {
      const dx = wx - playerState.x;
      const dy = wy - playerState.y;
      return {
        x: centerX + dx * scale,
        y: centerY + dy * scale,
      };
    };

    // 敵の描画（赤色のひし形、ネオン管風）
    if (enemiesState && enemiesState.length > 0) {
      ctx.fillStyle = "#ff3333";
      ctx.shadowColor = "#ff0000";
      // ctx.shadowBlur = 5 * ratio; // 削除
      
      const blipSize = 5 * ratio;

      enemiesState.forEach((enemy) => {
        const pos = getRadarPos(enemy.x, enemy.y);
        
        // 矩形範囲内判定
        if (
            pos.x >= centerX - halfSize && pos.x <= centerX + halfSize &&
            pos.y >= centerY - halfSize && pos.y <= centerY + halfSize
        ) {
          ctx.beginPath();
          // ひし形
          ctx.moveTo(pos.x, pos.y - blipSize);
          ctx.lineTo(pos.x + blipSize, pos.y);
          ctx.lineTo(pos.x, pos.y + blipSize);
          ctx.lineTo(pos.x - blipSize, pos.y);
          ctx.closePath();
          ctx.fill();
        }
      });
      // ctx.shadowBlur = 0; // 削除 (設定していないのでリセット不要)
    }

    // 他プレイヤーの描画（明るいグリーンの四角）
    if (otherPlayersState && otherPlayersState.length > 0) {
      ctx.fillStyle = "#ff0000ff"; // 黄緑
      const blipSize = 4 * ratio;

      otherPlayersState.forEach((p) => {
        if (p.id === playerState.id || p.isMe) return;
        const pos = getRadarPos(p.x, p.y);
        
        if (
            pos.x >= centerX - halfSize && pos.x <= centerX + halfSize &&
            pos.y >= centerY - halfSize && pos.y <= centerY + halfSize
        ) {
          ctx.beginPath();
          ctx.rect(pos.x - blipSize/2, pos.y - blipSize/2, blipSize, blipSize);
          ctx.fill();
          
          // IDタグ風の線
          ctx.strokeStyle = "#ff0000ff";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y - blipSize);
          ctx.lineTo(pos.x, pos.y - blipSize * 2);
          ctx.stroke();
        }
      });
    }

    ctx.restore(); // クリップ解除

    // --- 6. 自機シンボル（中央） ---
    // クリップの外に描画して、一番上に表示
    ctx.save();
    ctx.translate(centerX, centerY);
    
    // 自機の向きに合わせて回転
    const myRot = playerState.rotationAngle !== undefined
        ? playerState.rotationAngle
        : playerState.aimAngle;
    // 画面上は上が-90度(270度)なので補正
    ctx.rotate(myRot + Math.PI / 2);

    // F-16 HUDシンボル風（中抜きの円＋機首ライン）
    const symbolColor = "#00ff00"; // 完全な緑
    ctx.strokeStyle = symbolColor;
    ctx.fillStyle = symbolColor;
    ctx.lineWidth = 1 * ratio;
    ctx.shadowColor = symbolColor;
    // ctx.shadowBlur = 4 * ratio; // 削除

    const s = 6 * ratio;
    
    // 機体シンボル
    ctx.beginPath();
    // 三角形
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.6, s * 0.8);
    ctx.lineTo(0, s * 0.5);
    ctx.lineTo(-s * 0.6, s * 0.8);
    ctx.closePath();
    ctx.stroke();
    // 中心点
    ctx.beginPath();
    ctx.arc(0, 0, 1 * ratio, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  /**
   * 静的要素（背景、グリッド、MFDフレーム）のキャッシュを更新
   */
  updateStaticCache(width, height, ratio) {
    this.staticCanvas.width = width;
    this.staticCanvas.height = height;
    const ctx = this.staticCtx;

    // クリア
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const size = Math.min(width, height) * 0.85;
    const halfSize = size / 2;

    const left = centerX - halfSize;
    const right = centerX + halfSize;
    const top = centerY - halfSize;
    const bottom = centerY + halfSize;

    // --- A. 背景（MFD風の黒/濃緑） ---
    ctx.fillStyle = "rgba(0, 20, 10, 0)";
    ctx.fillRect(left, top, size, size);

    // --- B. グリッド（レンジリング・十字） ---
    const gridColor = "rgba(0, 255, 51, 1)";
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1 * ratio;
    
    // 十字線
    ctx.setLineDash([4 * ratio, 4 * ratio]);
    ctx.beginPath();
    ctx.moveTo(left, centerY);
    ctx.lineTo(right, centerY);
    ctx.moveTo(centerX, top);
    ctx.lineTo(centerX, bottom);
    ctx.stroke();
    
    // レンジリング（円弧だが四角の中だけ見えるイメージ）
    // 3段階の距離円
    const rings = 3;
    const maxRadius = halfSize;
    ctx.setLineDash([]); // 実線
    ctx.lineWidth = 1 * ratio;
    ctx.strokeStyle = "rgba(0, 255, 50, 0.2)";

    for (let i = 1; i <= rings; i++) {
        const r = (maxRadius / rings) * i;
        ctx.beginPath();
        // 四角からはみ出さないようにクリップして描くのが本来だが、
        // ここでは単純に円を描き、後でメイン描画時に四角クリップされるので問題ない
        // ただし四隅に余計な線が出ないよう、四角形の内接円までに留めるデザインにする
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    // --- C. MFDフレーム（四隅のL字ブラケット） ---
    const frameColor = "#00ff33"; // 鮮やかなグリーン
    const cornerSize = 20 * ratio;
    const lineW = 0.5 * ratio;

    ctx.strokeStyle = frameColor;
    ctx.lineWidth = lineW;
    ctx.shadowColor = frameColor;
    // ctx.shadowBlur = 8 * ratio; // 削除
    ctx.lineCap = "square";
    ctx.setLineDash([]);

    // 左上
    ctx.beginPath();
    ctx.moveTo(left, top + cornerSize);
    ctx.lineTo(left, top);
    ctx.lineTo(left + cornerSize, top);
    ctx.stroke();

    // 右上
    ctx.beginPath();
    ctx.moveTo(right - cornerSize, top);
    ctx.lineTo(right, top);
    ctx.lineTo(right, top + cornerSize);
    ctx.stroke();

    // 右下
    ctx.beginPath();
    ctx.moveTo(right, bottom - cornerSize);
    ctx.lineTo(right, bottom);
    ctx.lineTo(right - cornerSize, bottom);
    ctx.stroke();

    // 左下
    ctx.beginPath();
    ctx.moveTo(left + cornerSize, bottom);
    ctx.lineTo(left, bottom);
    ctx.lineTo(left, bottom - cornerSize);
    ctx.stroke();

    // --- D. テキスト情報 (MFD OSD) ---
    // ctx.shadowBlur = 0; // 削除
    ctx.fillStyle = frameColor;
    ctx.font = `bold ${11 * ratio}px "Orbitron", sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // 上部情報
    ctx.fillText("RDR", left + 5 * ratio, top + 5 * ratio);
    ctx.textAlign = "right";
    
    // 中央の目盛り数値（レンジ）
    ctx.fillStyle = "rgba(0, 255, 51, 1)";
    ctx.font = `${9 * ratio}px "Roboto Mono", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
   
  }
}