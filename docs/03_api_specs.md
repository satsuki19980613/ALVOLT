`# 03. API & Protocol Specifications

このドキュメントは、**ALVOLT** におけるクライアント・サーバー間の通信プロトコル、および外部連携用のCloud Functions API仕様を定義します。

---

## 1. WebSocket Connection

リアルタイム通信には WebSocket (`ws`) を使用します。

### 1.1 接続エンドポイント
* **URL:** `wss://<game-server-host>/?userId={uid}&playerName={name}&debug={bool}`
* **Query Parameters:**
    * `userId` (required): プレイヤーの一意なID (UUIDまたはFirebase UID)。
    * `playerName` (optional): 表示名。デフォルトは "Guest"。
    * `debug` (optional): `true` の場合、ジッター計測等のデバッグモードを有効化。

---

## 2. Binary Protocol (Real-time Gameplay)

ゲームプレイ中の高頻度な通信（入力、状態同期）には、帯域幅削減のためカスタムバイナリプロトコルを使用します。
バイトオーダーは **Little Endian** です。

### 2.1 Data Types
| Type | Size (Bytes) | Description |
| :--- | :--- | :--- |
| `u8` | 1 | Unsigned 8-bit Integer |
| `u16` | 2 | Unsigned 16-bit Integer |
| `u32` | 4 | Unsigned 32-bit Integer |
| `f32` | 4 | 32-bit Float (IEEE 754) |
| `string` | 1 + N | Length (u8) + UTF-8 Bytes |

### 2.2 C2S: Player Input (Client -> Server)
クライアントからサーバーへ、約16ms間隔で送信されます。

| Offset | Type | Field | Description |
| :--- | :--- | :--- | :--- |
| 0 | `u8` | **MsgType** | 固定値 `2` (MSG_TYPE_INPUT) |
| 1 | `u16` | **InputMask** | 入力ビットフラグ (下記参照) |
| 3 | `u32` | **Sequence** | 入力シーケンス番号 |
| 7 | `f32` | **MouseX** | マウスのワールドX座標 |
| 11 | `f32` | **MouseY** | マウスのワールドY座標 |
| **Total** | **15 Bytes** | | |

**InputMask Bit Definition:**
```javascript
const INPUT_BIT_MAP = {
  move_up:      1 << 0,  // 1
  move_down:    1 << 1,  // 2
  move_left:    1 << 2,  // 4
  move_right:   1 << 3,  // 8
  shoot:        1 << 4,  // 16
  trade_long:   1 << 5,  // 32
  bet_up:       1 << 6,  // 64
  bet_down:     1 << 7,  // 128
  bet_all:      1 << 8,  // 256
  bet_min:      1 << 9,  // 512
  trade_short:  1 << 10, // 1024
  trade_settle: 1 << 11  // 2048
};`

### 2.3 S2C: Game State Delta (Server -> Client)

サーバーからクライアントへ、約33ms間隔で送信されます。可変長です。

| **Order** | **Type** | **Field** | **Description** |
| --- | --- | --- | --- |
| 1 | `u8` | **MsgType** | 固定値 `1` (MSG_TYPE_DELTA) |
| **Removed** |  |  |  |
| 2 | `u8` | RemPlayerCount | 削除されたプレイヤー数 |
| 3 | `string[]` | RemPlayerIDs | 削除されたIDリスト |
| 4 | `u8` | RemEnemyCount | 削除された敵数 |
| 5 | `string[]` | RemEnemyIDs | 削除されたIDリスト |
| 6 | `u16` | RemBulletCount | 削除された弾丸数 |
| 7 | `string[]` | RemBulletIDs | 削除されたIDリスト |
| **Updated Players** |  |  |  |
| 8 | `u8` | PlayerCount | 更新されたプレイヤー数 |
| 9 | `struct[]` | PlayerData | 以下の構造体の繰り返し |
| > | `string` | id |  |
| > | `f32` | x |  |
| > | `f32` | y |  |
| > | `u8` | hp | 0-100 (clamp) |
| > | `f32` | angle | 移動角度 |
| > | `f32` | aimAngle | 砲塔角度 |
| > | `string` | name | プレイヤー名 |
| > | `u32` | lastAck | 最後に処理した入力Seq |
| > | `u8` | isDead | 1=Dead, 0=Alive |
| > | `u16` | ep | Energy Points |
| > | `u16` | betAmount | 現在のBET額 |
| > | `u8` | hasPosition | 1=ポジションあり, 0=なし |
| > | `f32` | entryPrice | (If hasPosition=1) |
| > | `f32` | amount | (If hasPosition=1) |
| > | `u8` | posType | (If hasPosition=1) 0=Long, 1=Short |
| > | `u8` | stockCount | 所持弾薬数 |
| > | `u16[]` | stockDamages | 弾薬ごとの威力リスト |
| **Updated Enemies** |  |  |  |
| 10 | `u8` | EnemyCount | 更新された敵数 |
| 11 | `struct[]` | EnemyData | `id(str), x(f32), y(f32), hp(u8), targetAngle(f32)` |
| **Updated Bullets** |  |  |  |
| 12 | `u16` | BulletCount | 更新された弾丸数 |
| 13 | `struct[]` | BulletData | `id(str), x(f32), y(f32), angle(f32), typeId(u8)` |
| **Events** |  |  |  |
| 14 | `u8` | EventCount | イベント数 |
| 15 | `struct[]` | EventData | 以下の構造体の繰り返し |
| > | `u8` | typeId | 1=Hit, 2=Explosion |
| > | `f32` | x |  |
| > | `f32` | y |  |
| > | `string` | color | エフェクト色 (例: "#ff0000") |

**Bullet Type IDs:**

- `0`: DEFAULT (Orb)
- `1`: ENEMY (Red Trail)
- `2`: ORB (Power < 50)
- `3`: SLASH (Power 50-99)
- `4`: FIREBALL (Power 100+)
- `5`: ITEM_EP

---

## 3. JSON Protocol (State & Metadata)

初期化やメタデータの送受信には JSON 形式の WebSocket メッセージを使用します。

### 3.1 S2C: Server to Client

### `join_success`

接続確立時に送信されます。

JSON

`{
  "type": "join_success",
  "payload": {
    "roomId": "room_12345",
    "worldConfig": {
      "width": 3000,
      "height": 3000
    }
  }
}`

### `static_state`

マップ上の静的オブジェクト（障害物）の定義です。

JSON

`{
  "type": "static_state",
  "payload": {
    "obstacles": [
      {
        "id": "obs_1",
        "x": 100, "y": 200,
        "width": 420, "height": 420,
        "styleType": "obs-hexagon-fortress-animated",
        "rotation": 0
      }
    ],
    "playerSpawns": [{ "x": 500, "y": 500 }],
    "enemySpawns": [{ "x": 1500, "y": 1500 }]
  }
}`

### `chart_state`

接続時のチャート初期データ（全履歴）です。

JSON

`{
  "type": "chart_state",
  "payload": {
    "chartData": [1000, 1005, 998, ...],
    "maData": {
      "short": [ ... ],
      "medium": [ ... ],
      "long": [ ... ]
    },
    "currentPrice": 1020,
    "minPrice": 900,
    "maxPrice": 1100
  }
}`

### `chart_update`

500msごとに送信されるチャートの差分更新です。

JSON

`{
  "type": "chart_update",
  "payload": {
    "currentPrice": 1025,
    "minPrice": 900,
    "maxPrice": 1105,
    "newChartPoint": 1025,
    "newMaPoint": {
      "short": 1010,
      "medium": 1005,
      "long": 1000
    }
  }
}`

### `leaderboard_update`

2000msごとに送信されるランキング情報です。

JSON

`{
  "type": "leaderboard_update",
  "payload": {
    "leaderboardData": [
      { "id": "user1", "name": "Ace", "score": 5000 },
      ...
    ],
    "serverStats": { ... }
  }
}`

### 3.2 C2S: Client to Server

### `pause` / `resume`

アプリケーションのバックグラウンド移行時などに送信します。

JSON

`{ "type": "pause" }
{ "type": "resume" }`

---

## 4. Cloud Functions API

アカウント管理とデータ引継ぎのためのHTTPS Callable関数です。

リージョン: asia-northeast1

### 4.1 `issueTransferCode`

現在のユーザーに対して、データ引継ぎ用の一時コードを発行します。

- **Auth Requirement:** 必須 (Guest or Member)
- **Request:** `{}` (Empty)
- **Response:**JSON
    
    `{
      "code": "A1B2C3" // 6桁の英数字
    }`
    

### 4.2 `recoverAccount`

引継ぎコードを使用してアカウントを復元（ログイン）します。

- **Auth Requirement:** 不要（未ログイン状態から呼び出し可能）
- **Request:**JSON
    
    `{
      "code": "A1B2C3"
    }`
    
- **Response:**JSON
    
    `{
      "customToken": "eyJhbGciOiJ..." // Firebase Custom Auth Token
    }`
    
- **Error Codes:**
    - `not-found`: 無効なコード。
    - `cancelled`: コードの有効期限切れ。