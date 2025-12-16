`# 04. Data Schema & Persistence

このドキュメントは、**ALVOLT** で使用されるデータベース（Firestore）、およびクライアントサイドの永続化データのスキーマ定義を記述します。

---

## 1. Google Cloud Firestore (NoSQL)

永続的なプレイヤーデータおよび一時的なトランザクションデータの保存に使用します。

### 1.1 Collection: `ranking`
プレイヤーのハイスコアと基本情報を保持します。リーダーボードの表示に使用されます。

* **Document Path:** `ranking/{userId}`
* **Document ID:** Firebase Auth UID

| Field Name | Type | Description | Notes |
| :--- | :--- | :--- | :--- |
| `uid` | `string` | ユーザーID | Document IDと同一 |
| `name` | `string` | プレイヤー名 | 最大10文字 |
| `highScore` | `number` | 自己ベストスコア | 整数値 |
| `lastPlayed` | `timestamp` | 最終プレイ日時 | `FieldValue.serverTimestamp()` |

**インデックス設定:**
* 複合インデックス: `highScore` (DESC) + `lastPlayed` (DESC) （ランキングクエリ用）

### 1.2 Collection: `transfer_codes`
アカウント引継ぎ用の一時的なコードを管理します。Cloud Functions からのみアクセスされます。

* **Document Path:** `transfer_codes/{code}`
* **Document ID:** 生成された6桁の英数字コード (例: "A1B2C3")

| Field Name | Type | Description | Notes |
| :--- | :--- | :--- | :--- |
| `uid` | `string` | 対象ユーザーID | 引継ぎ元のUID |
| `createdAt` | `number` | 作成日時 (Unix Time) | `Date.now()` |
| `expiresAt` | `number` | 有効期限 (Unix Time) | 作成から24時間後 |

**TTL (Time-To-Live) ポリシー:**
* `expiresAt` フィールドに基づき、有効期限切れのドキュメントは自動的に削除される設定を推奨。

---

## 2. Client Local Storage (Browser)

クライアント側の設定保存に `window.localStorage` を使用します。

### 2.1 Key: `game_key_map`
ユーザーがカスタマイズしたキーコンフィグ設定。

* **Value Format:** JSON String
* **Structure:**
  ```json
  {
    "KeyW": "move_up",
    "KeyS": "move_down",
    "KeyA": "move_left",
    "KeyD": "move_right",
    "ArrowUp": "bet_up",
    "ArrowDown": "bet_down",
    ...
  }`

---

## 3. Runtime In-Memory State (Server)

データベースには保存されず、サーバーのメモリ上でのみ存在するゲーム実行中のデータ構造です。
※詳細は `02_class_definitions.md` を参照ですが、ここではデータ構造の観点で記述します。

### 3.1 Trading State (Singleton)

金融システムの現在の状態。

JavaScript

`{
  chartData: number[],      // 過去300ティック分の価格履歴
  maData: {
    short: number[],        // 短期移動平均線 (Period: 20)
    medium: number[],       // 中期移動平均線 (Period: 50)
    long: number[]          // 長期移動平均線 (Period: 100)
  },
  currentPrice: number,     // 現在価格 (Min: 200, Max: 5000)
  minPrice: number,         // チャート表示範囲用
  maxPrice: number
}`

### 3.2 Spatial Grid

物理演算用の空間分割データ。

JavaScript

`// Map<HashKey, Entity[]>
// HashKey = (GridX << 16) | GridY
{
  [key: number]: Entity[]
}`