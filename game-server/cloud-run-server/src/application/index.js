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

initializeApp({ projectId: "trading-charge-shooter" });
const firestore = getFirestore();
console.log("Firebase Admin SDK initialized.");

const app = express();
app.use(cors());
app.use(express.json());

const staticPath = path.join(__dirname, "../../public");
app.use(express.static(staticPath));
console.log(`Serving static files from: ${staticPath}`);

const PORT = process.env.PORT || 8080;
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

  try {
    const params = new URLSearchParams(req.url.split("?")[1]);
    userId = params.get("userId");
    const playerName = params.get("playerName") || "Guest";
    const isDebug = params.get("debug") === "true";

    if (!userId) {
      ws.close(1008, "userId required");
      return;
    }

    game = findOrCreateRoom();

    game.addPlayer(userId, playerName, ws, isDebug);

    ws.on("message", (message) => {
      const isBinary =
        Buffer.isBuffer(message) || message instanceof ArrayBuffer;

      if (isBinary && game) {
        const buf = Buffer.isBuffer(message) ? message : Buffer.from(message);
        if (buf.length >= 15) {
          const msgType = buf.readUInt8(0);
          if (msgType === 2) {
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
      if (game) game.removePlayer(userId);
    });

    ws.on("error", () => {
      if (game) game.removePlayer(userId);
    });
  } catch (e) {
    console.error("Connection Error:", e);
    ws.close(1011, "Server Error");
  }
});



server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
