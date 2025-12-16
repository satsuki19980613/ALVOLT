# 02. Class Definitions

このドキュメントは、**ALVOLT** のサーバーおよびクライアントで使用される主要なクラス、データモデル、およびシステムの定義を記述します。

---

## 1. Domain Entities (Server-Side)
`game-server/cloud-run-server/src/domain/`

ゲームの状態を保持するデータクラス群です。

### 1.1 BaseState
すべてのエンティティの基底クラス。
* **Properties:**
    * `id` (string): UUID
    * `x`, `y` (number): ワールド座標
    * `radius` (number): 衝突判定用半径
    * `type` (string): エンティティタイプ ('player', 'enemy', 'bullet', 'obstacle_wall')
    * `isDirty` (boolean): 更新フラグ

### 1.2 PlayerState (extends BaseState)
プレイヤーのゲーム状態およびトレーディング状態を管理します。
* **Game Stats:**
    * `hp` (number): 体力 (Max: 100)
    * `ep` (number): 資金/エネルギー (Energy Points)
    * `score` (number): スコア
    * `isDead` (boolean): 死亡フラグ
* **Physics:**
    * `angle` (number): 移動方向
    * `aimAngle` (number): 砲塔の向き
    * `vx`, `vy` (number): 速度ベクトル
* **Trading State:**
    * `chargeBetAmount` (number): 次のエントリーへの賭け金
    * `chargePosition` (Object | null): 現在保有している建玉
        * `{ entryPrice, amount, type: 'long'|'short' }`
    * `stockedBullets` (Array): 利確により獲得した弾薬リスト (`{ damage, type }`)

### 1.3 EnemyState (extends BaseState)
AI操作の敵キャラクター。
* **Properties:**
    * `hp` (number): 体力
    * `targetAngle` (number): 移動目標角度
    * `shootCooldown` (number): 射撃クールダウンタイマー
    * `moveTimer` (number): 行動変更タイマー

### 1.4 BulletState (extends BaseState)
弾丸オブジェクト。
* **Properties:**
    * `vx`, `vy` (number): 速度
    * `damage` (number): 威力（トレーディング利益により変動）
    * `ownerId` (string): 発射したプレイヤーのID（FF防止用）
    * `type` (number): 弾種ID (`BulletType` Enum参照)

### 1.5 ObstacleState (extends BaseState)
静的な障害物および壁。
* **Properties:**
    * `width`, `height` (number): 寸法
    * `rotation` (number): 回転角度 (Radian)
    * `colliders` (Array): 詳細な衝突判定用の矩形リスト (`{ x, y, w, h, angle }`)
    * `className` (string): 描画用スキンID (例: 'obs-hexagon-fortress-animated')

### 1.6 WorldState
ゲーム全体の状態コンテナ。
* **Collections:**
    * `players` (Map<string, PlayerState>)
    * `enemies` (Array<EnemyState>)
    * `bullets` (Array<BulletState>)
    * `obstacles` (Array<ObstacleState>)
* **System State:**
    * `isRunning` (boolean): ゲームループ稼働状態
    * `frameEvents` (Array): そのフレームで発生したイベント（ヒット、爆発など）

---

## 2. Server Systems & Services
`game-server/cloud-run-server/src/`

エンティティを操作するロジックの実装クラスです。

### 2.1 ServerGame (`application/ServerGame.js`)
ゲームインスタンスのエントリーポイント。
* **Methods:**
    * `update()`: メインループ処理
    * `addPlayer()`, `removePlayer()`: 接続管理
    * `handlePlayerInput()`: 入力処理のディスパッチ

### 2.2 PhysicsSystem (`infrastructure/systems/PhysicsSystem.js`)
物理演算と衝突判定を担当。
* **Components:**
    * `SpatialGrid`: 空間分割による計算量削減
* **Methods:**
    * `update(worldState, dt)`: 位置更新と衝突解決
    * `resolveEntityCollisions()`: 動的オブジェクト同士の衝突
    * `resolveObstacleCollisions()`: 壁との衝突（押し出し処理）

### 2.3 TradingSystem (`domain/systems/TradingSystem.js`)
金融ロジックの中核。
* **State:**
    * `chartData` (Array): 価格履歴
    * `maData` (Object): 短期・中期・長期移動平均線データ
    * `currentPrice` (number): 現在価格
* **Methods:**
    * `updateChart()`: 価格変動とMA計算
    * `handleEntry(player, type)`: ポジションエントリー処理
    * `handleSettle(player)`: 決済処理と弾薬生成

### 2.4 NetworkSystem (`infrastructure/systems/NetworkSystem.js`)
通信処理とデータ圧縮。
* **Methods:**
    * `broadcastGameState()`: 全プレイヤーへ状態送信
    * `createBinaryDelta()`: 差分データのバイナリ生成
    * `getRelevantEntityMapsFor()`: プレイヤー毎の可視範囲フィルタリング (Interest Management)

### 2.5 PlayerActionDispatcher (`application/services/PlayerActionDispatcher.js`)
クライアントからの入力を適切なシステムへ振り分けます。
* **Role:** 入力パケット (`MsgType=2`) を解析し、移動、射撃、トレード操作を各システムへ委譲。

---

## 3. Pure Logic Modules
`game-server/cloud-run-server/src/logic/`

ステートレスな純粋関数群。

* **`CollisionLogic`**: 円・矩形の交差判定、押し出しベクトルの計算。
* **`TradeLogic`**: 価格のランダムウォーク計算、移動平均(MA)計算、損益(P&L)計算。
* **`MovementLogic`**: 入力ビットマスクからのベクトル計算。
* **`PlayerLogic`**: 慣性移動計算、オートエイム角度計算。
* **`AILogic`**: 敵の索敵、追跡、射撃判断。

---

## 4. Client View Models & Managers
`assets_project/public/src_v2/`

### 4.1 VisualPlayer (`domain/view_models/VisualPlayer.js`)
描画用に補間されたプレイヤーモデル。
* **Properties:**
    * `targetX`, `targetY`: サーバーから受信した目標位置
    * `rotationAngle`: 機体の回転（補間あり）
    * `aimAngle`: 砲塔の向き（補間あり）
    * `chargePosition`: UI表示用のトレード状態

### 4.2 StateSyncManager (`application/managers/StateSyncManager.js`)
サーバー状態の受信と補間管理。
* **Methods:**
    * `applySnapshot()`: 完全な状態同期
    * `applyDelta()`: 差分更新の適用
    * `updateInterpolation(dt)`: `StateInterpolator` を使用して描画座標を計算

### 4.3 Rendering Services
* **`PixiRenderer`**: PIXI.jsを使用したメインゲーム画面の描画。
* **`ChartRenderer`**: HTML5 Canvasを使用したチャート描画。
* **`RadarRenderer`**: HTML5 Canvasを使用したレーダー描画。
* **`CyberUIRenderer`**: メニュー画面等の背景演出。

---

## 5. Infrastructure Adapters

### 5.1 PacketWriter / PacketReader
バイナリデータの読み書きを行うユーティリティ。
* `u8`, `u16`, `u32`, `f32`, `string` の型に対応。

### 5.2 FirebaseAuthAdapter
Firebase Authentication との連携。
* 匿名認証、名前登録、カスタムトークンによる引継ぎ処理を担当。