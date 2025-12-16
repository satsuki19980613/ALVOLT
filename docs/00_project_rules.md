# ALVOLT Project Rules & Guidelines

このドキュメントは、**ALVOLT (Trading x Shooter Hybrid Game)** 開発におけるアーキテクチャ、コーディング規約、およびワークフローのルールを定義します。

---

## 1. プロジェクト概要
**ALVOLT**は、金融トレーディングの要素（チャート分析、ロング/ショート、損益）とトップダウンシューティングを融合させたリアルタイムオンラインゲームです。

* **コアコンセプト:** "Earn ammo through profit"（利益を弾薬に変えて戦う）
* **プラットフォーム:** Webブラウザ (Mobile/Desktop)
* **デプロイ環境:** Firebase Hosting + Cloud Run (WebSocket Server)

---

## 2. アーキテクチャ原則

本プロジェクトは **権威サーバー方式 (Authoritative Server)** と **ドメイン駆動設計 (DDD)** の思想を採用しています。

### 2.1 システム構成
* **Client (`satsuki19980613-alvolt/assets_project`)**:
    * 描画: PIXI.js v8
    * UI: HTML5 DOM + CSS (Cyberpunk Style)
    * 入力: Virtual Joystick / Keyboard
* **Server (`satsuki19980613-alvolt/game-server`)**:
    * ランタイム: Node.js (Cloud Run)
    * 通信: WebSocket (`ws`)
    * 物理演算: サーバーサイドで実行・判定
* **Infrastructure**:
    * Auth/DB: Firebase Auth, Firestore
    * Logic: Cloud Functions (引継ぎコード発行など)

### 2.2 レイヤー設計 (DDD)
ソースコードは以下のレイヤーに厳格に分離されています。依存方向を守ってください。

1.  **`application/` (Application Layer)**
    * ゲームループ、シーン遷移、入力とロジックの橋渡しを担当。
    * 例: `ClientGame.js`, `ServerGame.js`, `AppFlowManager.js`
2.  **`domain/` (Domain Layer)**
    * ゲームの核となる状態（State）やモデル定義。
    * 例: `PlayerState.js`, `WorldState.js`, `VisualPlayer.js`
3.  **`logic/` (Logic Layer / Pure Functions)**
    * **重要:** 状態を持たない純粋関数群。テスト可能であること。
    * UIや描画コードに依存してはならない。
    * 例: `CollisionLogic.js`, `TradeLogic.js`, `MovementLogic.js`
4.  **`infrastructure/` (Infrastructure Layer)**
    * 外部ライブラリ（PIXI, Firebase, WebSocket）への具体的な実装。
    * 例: `PixiRenderer.js`, `NetworkClient.js`, `FirebaseAuthAdapter.js`
5.  **`core/` (Shared Core)**
    * 定数、設定、インターフェース。
    * 例: `Protocol.js`, `GameConstants.js`, `ClientConfig.js`

---

## 3. コーディング規約

### 3.1 命名規則
* **クラス名:** PascalCase (`PlayerSystem`)
* **メソッド/変数:** camelCase (`calculateVelocity`)
* **定数:** UPPER_SNAKE_CASE (`MAX_CHART_POINTS`)
* **プライベートメソッド（慣習）:** 接頭辞 `_` (`_drawGrid`)

### 3.2 禁止事項
* ❌ **マジックナンバーの使用:** 数値は必ず `GameConstants.js` や `ClientConfig.js` 等の定数ファイルに定義して使用する。
* ❌ **レイヤー違反:** `logic/` 内のファイルで `document` や `window`、`PIXI` オブジェクトを直接操作しない。
* ❌ **God Class:** 1つのファイルに責務を詰め込みすぎない。`Manager` や `System` に適切に委譲する。

---

## 4. 通信プロトコル仕様

リアルタイム性と帯域幅の最適化のため、用途に応じてプロトコルを使い分けます。

### 4.1 バイナリ通信 (Binary Protocol)
* **用途:** ゲームプレイ中の頻繁な更新（位置同期、入力送信）。
* **実装:** `PacketWriter.js` / `PacketReader.js` / `BinaryProtocolHandler.js` を使用。
* **圧縮:** `INPUT_BIT_MAP` 等を使用し、可能な限りビット演算で圧縮する。

### 4.2 JSON通信
* **用途:** 初期化（Join Success）、チャット、リーダーボード更新、チャートデータの同期。
* **形式:** `{ type: "event_name", payload: { ... } }`

---

## 5. アセット管理フロー
* **スプライト:** TexturePackerを使用し、Json + PNG形式で管理。
* **パス:** `assets_project/public/assets/` 配下に配置。
* **ロード:** `AssetLoader.js` と `EffectConfig.js` を通じて読み込む。ハードコードされたパスを避け、Configを参照すること。

---

## 6. AIアシスタントワークフロー (Cursor Rules)

AIを使用した開発・修正を行う際は、以下のモード定義に従います。

### 🛠️ INVESTIGATE MODE
コードを書く前に、影響範囲を調査するモード。
1.  `@Codebase` 全体を検索し、関連ファイルを特定。
2.  以下のフォーマットで分析結果を出力する。
    * **Target Issue:** [課題の要約]
    * **Relevant Files:** [ファイルパスのリスト]
    * **Current Logic Analysis:** [現状のロジック解説]
    * **Request to Architect:** "Please provide a solution..."

### 🛠️ AUDIT MODE
コード変更後の品質チェックモード。コミット前に必ず実施。
1.  **Check:** マジックナンバーはないか？
2.  **Check:** DDDレイヤー分離は守られているか？（LogicがUIに依存していないか）
3.  **Check:** 変数名は適切か？
4.  **Verdict:**
    * ✅ PASS: "No violations found."
    * ❌ FAIL: 具体的な違反箇所と修正案を提示。

---

## 7. ディレクトリ構造概略

```text
root/
├── assets_project/ (Client)
│   └── public/
│       ├── src_v2/
│       │   ├── application/  (Game Loop, Managers)
│       │   ├── domain/       (State Models)
│       │   ├── infrastructure/ (Rendering, Network, UI, Auth)
│       │   ├── logic/        (Pure Calculation Logic)
│       │   └── core/         (Config, Constants)
├── game-server/ (Server)
│   ├── cloud-run-server/
│   │   └── src/
│   │       ├── application/
│   │       ├── domain/
│   │       ├── infrastructure/
│   │       └── logic/
│   └── functions/ (Firebase Functions)
└── tools/ (MapEditor, etc.)