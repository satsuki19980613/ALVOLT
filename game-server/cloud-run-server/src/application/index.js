import express from "express";
import cors from "cors";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import path from "path";
import { fileURLToPath } from "url";
import { ServerGame } from "./ServerGame.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase初期化 (エラーハンドリング付き)
try {
  initializeApp({ projectId: "ALVOLT" });
  console.log("Firebase Admin SDK initialized.");
} catch (e) {
  console.log("Firebase Admin SDK already initialized or failed: " + e.message);
}

const firestore = getFirestore();

const app = express();
app.use(cors({ origin: true })); // 全オリジン許可(デバッグ用)
app.use(express.json());

const staticPath = path.join(__dirname, "../../public");
app.use(express.static(staticPath));

// ヘルスチェック用エンドポイント (重要！)
app.get("/", (req, res) => {
  res.send("ALVOLT Game Server is Running!");
});

// ポート設定 (Cloud Runの要件)
const PORT = parseInt(process.env.PORT) || 8080;
const server = createServer(app);
const wss = new WebSocketServer({ server });

const activeRooms = new Map();

function onRoomEmpty(roomId) {
  if (activeRooms.has(roomId)) {
    activeRooms.delete(roomId);
    console.log(`[Manager] Room ${roomId} removed.`);
  }
}

function findOrCreateRoom() {
  for (const [roomId, game] of activeRooms.entries()) {
    if (game.worldState.players.size < 8 && game.worldState.isRunning) {
      return game;
    }
  }
  const newRoomId = `room_${Date.now()}`;
  const newGame = new ServerGame(newRoomId, firestore, onRoomEmpty);

  newGame.warmup().catch((e) => console.error("Warmup Error:", e));

  activeRooms.set(newRoomId, newGame);
  return newGame;
}

wss.on("connection", (ws, req) => {
  let userId = null;
  let game = null;

  console.log("[WS] New connection attempt..."); // ログ追加

  try {
    // URLパース処理の安全性向上
    const urlParts = req.url.split("?");
    if (urlParts.length < 2) {
        ws.close(1008, "Query params missing");
        return;
    }
    const params = new URLSearchParams(urlParts[1]);
    
    userId = params.get("userId");
    const playerName = params.get("playerName") || "Guest";
    const isDebug = params.get("debug") === "true";

    if (!userId) {
      console.log("[WS] Connection rejected: No userId");
      ws.close(1008, "userId required");
      return;
    }

    console.log(`[WS] Player joining: ${playerName} (${userId})`);

    game = findOrCreateRoom();
    game.addPlayer(userId, playerName, ws, isDebug);

    ws.on("message", (message) => {
      // (中略 - そのまま)
      const isBinary =
        Buffer.isBuffer(message) || message instanceof ArrayBuffer;

      if (isBinary && game) {
        const buf = Buffer.isBuffer(message) ? message : Buffer.from(message);
        if (buf.length >= 15) {
          const msgType = buf.readUInt8(0);
          if (msgType === 2) {
             // ... バイナリ処理そのまま ...
            const mask = buf.readUInt16LE(1);
            const seq = buf.readUInt32LE(3);
            const mouseX = buf.readFloatLE(7);
            const mouseY = buf.readFloatLE(11);

            const input = {
              states: {
                move_up: !!(mask & 1),
                move_down: !!(mask & 2),
                move_left: !!(mask & 4),
                move_right: !!(mask & 8),
              },
              wasPressed: {
                shoot: !!(mask & 16),
                trade_long: !!(mask & 32),
                bet_up: !!(mask & 64),
                bet_down: !!(mask & 128),
                bet_all: !!(mask & 256),
                bet_min: !!(mask & 512),
                trade_short: !!(mask & 1024),
                trade_settle: !!(mask & 2048),
              },
              mouseWorldPos: { x: mouseX, y: mouseY },
            };
            game.handlePlayerInput(userId, input);
          }
        }
        return;
      }

      try {
        const data = JSON.parse(message.toString());
        if (game) {
          if (data.type === "pause") {
            const player = game.worldState.players.get(userId);
            if (player) player.isPaused = true;
          } else if (data.type === "resume") {
            const player = game.worldState.players.get(userId);
            if (player) player.isPaused = false;
          }
        }
      } catch (e) {}
    });

    ws.on("close", () => {
        console.log(`[WS] Closed: ${userId}`);
        if (game) game.removePlayer(userId);
    });

    ws.on("error", (err) => {
        console.error(`[WS] Error for ${userId}:`, err);
        if (game) game.removePlayer(userId);
    });
  } catch (e) {
    console.error("Connection Error:", e);
    ws.close(1011, "Server Error");
  }
});

// ★ここが最重要修正ポイント！
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at http://0.0.0.0:${PORT}/`);
});