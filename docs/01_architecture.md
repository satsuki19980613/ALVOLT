# 01. Architecture Overview

このドキュメントは、**ALVOLT** の技術的なアーキテクチャ、データフロー、および主要コンポーネントの相互作用について詳述します。

---

## 1. ハイレベル・システム構成

ALVOLTは、**権威サーバー (Authoritative Server)** モデルを採用したリアルタイムマルチプレイヤーゲームです。
クライアントは入力のみを送信し、ゲームの状態更新と物理演算の最終決定権はサーバーが持ちます。

### システム全体図

```mermaid
graph TD
    User[Player Client] -->|WebSocket (Binary/JSON)| CloudRun[Game Server (Cloud Run)]
    User -->|HTTPS| Hosting[Firebase Hosting]
    User -->|HTTPS| Auth[Firebase Auth]

    CloudRun -->|Read/Write| Firestore[Firestore (Ranking)]
    CloudRun -->|Physics/Logic| CloudRun

    Functions[Cloud Functions] -->|Manage| Firestore
    Functions -->|Verify| Auth
    User -->|HTTPS (Transfer)| Functions
```

ィティのみを送信して帯域を節約。

## 2. サーバーサイド・アーキテクチャ

サーバーは Node.js で動作し、`ws` ライブラリを用いて WebSocket 通信を管理します。

- **Location:** `game-server/cloud-run-server/`
- **Entry Point:** `src/application/index.js`

### 2.1 ゲームループ (`ServerGame.js`)

サーバーは複数の定期タスク（ループ）を並行して管理します。

| ループ名 | 間隔 (ms) | 役割 | 実装メソッド |
| --- | --- | --- | --- |
| **update** | 16ms (60fps) | 物理演算、AI、アイテム、プレイヤー状態の更新 | `update()` |
| **broadcast** | 33ms (30fps) | クライアントへの差分(Delta)送信（バイナリ） | `broadcastGameState()` |
| **chart** | 500ms | 金融チャートの価格更新とMA計算 | `updateChart()` |
| **leaderboard** | 2000ms | ランキング情報のブロードキャスト | `broadcastLeaderboard()` |

### 2.2 主要システム

- **PhysicsSystem (`PhysicsSystem.js`):**
    - 空間分割 (`SpatialGrid`) を使用して衝突判定を最適化。
    - プレイヤー、敵、弾丸、障害物の当たり判定を処理。
    - `CollisionLogic` (純粋関数) を使用して計算。
- **TradingSystem (`TradingSystem.js`):**
    - ALVOLTの核となる「金融」ロジック。
    - `TradeLogic` を使用して価格変動、移動平均線 (SMA)、損益 (P&L) を計算。
    - プレイヤーの `Short/Long` エントリーと決済 (`Settle`) を管理。
- **NetworkSystem (`NetworkSystem.js`):**
    - ゲーム状態の直列化 (Serialization) とブロードキャストを担当。
    - 可視範囲 (Viewport) に基づく **Interest Management** を実装し、プレイヤー近傍のエンティティのみを送信して帯域を節約。

---

## 3. クライアントサイド・アーキテクチャ

クライアントはブラウザ上で動作し、サーバーからの状態を受け取って描画します。

- **Location:** `assets_project/public/src_v2/`
- **Entry Point:** `boot.js` -> `ClientGame.js`

### 3.1 レンダリング・パイプライン

ALVOLTは、レイヤーごとに異なるレンダリング技術を使い分けています。

1. **Game World (PIXI.js v8)**
    - `PixiRenderer.js` が担当。
    - プレイヤー、敵、弾丸、エフェクト、背景グリッドを描画。
    - `TexturePacker` で生成されたスプライトシートを使用。
    - 加算合成 (`blendMode = 'add'`) を多用したネオン表現。
2. **HUD / UI (HTML5 Canvas & DOM)**
    - `CyberUIRenderer.js`: メニュー画面、背景演出（グリッチ、スターフィールド）。
    - `ChartRenderer.js`: 金融チャート（ローソク足/ライン、MA線）のリアルタイム描画。
    - `RadarRenderer.js`: 周囲の敵を表示するレーダー。
    - `MagazineRenderer.js`: 所持している弾丸（利益確定で得たリソース）の可視化。
    - **DOM Overlay**: HPバー、ボタン、数値表示などのインタラクティブ要素。

### 3.2 状態同期と補間 (`StateSyncManager.js`)

- **Snapshot & Delta:** サーバーから定期的に送られる差分 (`Delta`) を適用。
- **Interpolation:** `StateInterpolator.js` がサーバーからの更新間隔（33ms）を補間し、60fpsで滑らかに表示。
- **Client-side Prediction:** 自身の入力に対する反応を即座に返すため、サーバーの応答を待たずに移動予測を行う（位置補正あり）。

---

## 4. 通信プロトコル詳細

帯域幅を最小限に抑えるため、**バイナリプロトコル** と **JSON** を使い分けています。

### 4.1 バイナリ通信 (`PacketWriter` / `PacketReader`)

主に高頻度なゲームプレイデータの送受信に使用します。

### Client -> Server (Input)

- **Frequency:** ~16ms
- **Size:** 15 bytes
- **Structure:**
    - `Header` (1 byte): MsgType=2
    - `InputMask` (2 bytes): ビットフラグ (移動、射撃、トレード操作)
    - `Sequence` (4 bytes): 入力順序番号
    - `MouseX` (4 bytes): Float32
    - `MouseY` (4 bytes): Float32

### Server -> Client (Delta Update)

- **Frequency:** ~33ms
- **Variable Size**
- **Structure:**
    - `Header` (1 byte): MsgType=1
    - `Removed Entities` (Variable): 削除されたIDのリスト
    - `Updated Players` (Variable): 座標, HP, EP, アングル, チャートポジション状態
    - `Updated Enemies` (Variable)
    - `Updated Bullets` (Variable)
    - `Events` (Variable): ヒットエフェクト、爆発などの一回性のイベント

### 4.2 JSON通信

低頻度または構造が複雑なデータに使用します。

- `join_success`: 接続成功時の初期化データ。
- `static_state`: マップ（障害物）の静的配置データ。
- `chart_state`: チャートの全履歴データ（初期ロード用）。
- `chart_update`: 最新の価格更新データ。
- `leaderboard_update`: ランキング情報。

---

## 5. データモデル (Domain)

### 5.1 Player Entity (`PlayerState.js`)

- **Core Stats:** HP (Health), EP (Energy Points / 資金)。
- **Trade State:**
    - `chargeBetAmount`: 賭け金（弾薬生成コスト）。
    - `chargePosition`: 現在のポジション (`{ entryPrice, amount, type: 'long'|'short' }`)。
    - `stockedBullets`: 決済益によって生成された弾丸のストック。

### 5.2 World State (`WorldState.js`)

- 全ての動的エンティティ（Players, Enemies, Bullets）と静的エンティティ（Obstacles）を管理。
- `spatialGrid` とは別に、IDベースの `Map` でエンティティを保持。

---

## 6. インフラストラクチャ詳細

### 6.1 アカウント & 認証

- **Firebase Auth:** 匿名認証（ゲスト）と、Cloud Functionsを通じたデータ引継ぎ（カスタムトークン認証）。
- **Data Transfer:**
    - `issueTransferCode`: 一時的な引継ぎコードを発行（Firestoreに保存）。
    - `recoverAccount`: コードを検証し、カスタムトークンをクライアントに返却。

### 6.2 マップエディタ

- `tools/MapEditor_Standalone/` に同梱されたWebベースの専用ツール。
- **機能:**
    - 障害物の配置・回転・スナップ。
    - 衝突判定用コライダー（Rect）の編集。
    - JSON形式でのエクスポート (`map_default.json`)。