`# 05. Class Dependencies & Structure

このドキュメントは、**ALVOLT** の主要クラス間の依存関係と、コンポーネントの階層構造を定義します。

---

## 1. Server-Side Dependencies
**Entry Point:** `src/application/ServerGame.js`

サーバーサイドは `ServerGame` クラスを中心としたスター型に近い構成です。各システム(`System`)は `ServerGame` によってインスタンス化され、毎フレームの `update()` ループで呼び出されます。

```mermaid
classDiagram
    class ServerGame {
        +update()
        +broadcastGameState()
    }

    namespace Infrastructure {
        class PhysicsSystem
        class NetworkSystem
        class PersistenceSystem
        class WarmupSystem
        class MapLoader
    }

    namespace Domain {
        class WorldState
        class TradingSystem
        class PlayerSystem
        class EnemySystem
        class ItemSystem
    }

    namespace Logic_PureFunctions {
        class CollisionLogic
        class TradeLogic
        class PlayerLogic
        class AILogic
        class MovementLogic
    }

    ServerGame --> WorldState : Holds State
    ServerGame --> PhysicsSystem : Uses
    ServerGame --> NetworkSystem : Uses
    ServerGame --> TradingSystem : Uses
    ServerGame --> PlayerSystem : Uses
    ServerGame --> EnemySystem : Uses
    ServerGame --> PersistenceSystem : Uses
    ServerGame --> ItemSystem : Uses
    ServerGame --> WarmupSystem : Uses

    PhysicsSystem ..> CollisionLogic : Calls
    PhysicsSystem ..> ItemLogic : Calls
    TradingSystem ..> TradeLogic : Calls
    PlayerSystem ..> PlayerLogic : Calls
    EnemySystem ..> AILogic : Calls
    PlayerSystem ..> MovementLogic : Calls
    
    ServerGame ..> MapLoader : Initializes Map`

### 主要な依存関係の解説

- **`ServerGame`**: すべてのシステムを統括するゴッドクラス的役割ですが、ロジックの実装は各Systemに委譲しています。
- **`PhysicsSystem`**: `SpatialGrid` を内部に持ち、衝突判定を行います。純粋関数である `CollisionLogic` に強く依存します。
- **`NetworkSystem`**: `PacketWriter` を使用してバイナリデータを生成し、WebSocketを通じて送信します。
- **`PlayerActionDispatcher`**: `ServerGame` と `PlayerSystem`/`TradingSystem` の間に位置し、クライアントからの入力を適切な処理に振り分けます。

---

## 2. Client-Side Dependencies

**Entry Point:** `src_v2/boot.js` -> `ClientGame.js`

クライアントサイドは、**Logic(計算)**、**Rendering(描画)**、**UI(DOM)** の3つに大きく責務が分かれています。

コード スニペット

`classDiagram
    class Boot {
        +main()
    }
    class AppFlowManager
    class AccountManager
    class ClientGame

    Boot --> AppFlowManager : Init
    Boot --> AccountManager : Init
    Boot --> ClientGame : Init
    AppFlowManager --> ClientGame : Controls Flow

    class NetworkClient
    class StateSyncManager
    class InputManager
    class DomManipulator

    ClientGame --> NetworkClient : Comms
    ClientGame --> StateSyncManager : State Mgmt
    ClientGame --> InputManager : Input
    ClientGame --> DomManipulator : UI Overlay
    
    class GameRenderService
    class PixiRenderer
    class ChartRenderer
    class RadarRenderer

    ClientGame --> GameRenderService : Rendering Coordinator
    GameRenderService --> PixiRenderer : Game View
    GameRenderService --> ChartRenderer : Sub View
    GameRenderService --> RadarRenderer : Sub View

    StateSyncManager --> StateInterpolator : Smoothing
    NetworkClient --> BinaryProtocolHandler : Parsing`

### 主要な依存関係の解説

- **`AppFlowManager`**: ゲーム外のフロー（ログイン、アセットロード、シーン遷移）を管理し、`ClientGame` の起動・停止を制御します。
- **`ClientGame`**: ゲームプレイ中のメインコントローラーです。通信(`NetworkClient`)、入力(`InputManager`)、描画(`GameRenderService`)を保持します。
- **`StateSyncManager`**: サーバーから送られてきたスナップショットと差分(Delta)を `VisualPlayer` 等の描画用モデルに適用し、`StateInterpolator` で補間します。
- **`GameRenderService`**: 複数のレンダラー（Pixi, Canvas Chart, Canvas Radar）への描画命令を一括管理します。

---

## 3. Shared Logic & Infrastructure

クライアントとサーバー（または独立したツール）で共有、あるいは共通のインターフェースを持つ依存関係です。

### 3.1 Logic Layer (Pure Functions)

これらはステートレスであり、どのクラスからもインポートして使用可能です。

- `CollisionLogic.js`: サーバーの `PhysicsSystem` で主に使用。
- `TradeLogic.js`: サーバーの `TradingSystem` で主に使用。
- `InterpolationLogic.js`: クライアントの `StateInterpolator` で使用。

### 3.2 Infrastructure Adapters

- **`FirebaseAuthAdapter`**: `AccountManager` (Client) が依存。Firebase SDKをラップし、認証ロジックを隠蔽します。
- **`SkinFactory`**: `PixiRenderer` (Client) および `MapEditor` (Tools) が依存。Canvas APIを使用して動的にテクスチャを生成します。

---

## 4. Directory Dependency Map

ディレクトリ間の参照ルール（推奨）は以下の通りです。

1. **`application/`** は `domain/`, `infrastructure/`, `logic/`, `core/` を参照できる。
2. **`infrastructure/`** は `domain/`, `logic/`, `core/` を参照できる。
3. **`domain/`** は `logic/`, `core/` を参照できる。（Infrastructureへの依存は極力避ける）
4. **`logic/`** は `core/` のみ参照できる。（他への依存は禁止）
5. **`core/`** は他のディレクトリに依存してはならない。

Plaintext

`src/
├── application/ (Depends on ALL below)
│   ↓
├── infrastructure/ (Depends on Domain, Logic, Core)
│   ↓
├── domain/ (Depends on Logic, Core)
│   ↓
├── logic/ (Depends on Core only)
│   ↓
└── core/ (No Dependencies)`