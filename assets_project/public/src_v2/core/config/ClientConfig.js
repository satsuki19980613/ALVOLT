import { ENV } from './env.js';

const isDev = location.hostname.includes("alvolt-dev") || location.hostname.includes("localhost");
const targetServerUrl = isDev ? ENV.GAME_SERVER_URL_DEV : ENV.GAME_SERVER_URL_OFFICIAL;

// ▼▼▼ 原因特定のためのログ出力 (ここが重要！) ▼▼▼
console.log("=== ClientConfig Debug Start ===");
console.log("現在の場所 (hostname):", location.hostname);
console.log("判定モード (isDev):", isDev ? "開発環境(DEV)" : "本番環境(OFFICIAL)");
console.log("読み込んだENV全体:", ENV);
console.log("使おうとしているURL:", targetServerUrl);
console.log("=== ClientConfig Debug End ===");
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲


export const ClientConfig = {
  serverUrl: targetServerUrl,
  RENDER_LOOP_INTERVAL: 16,
  INPUT_SEND_INTERVAL: 16,
  CLIENT_LERP_RATE: 0.06,
  PREDICTION_FACTOR: 12.0,
  VIEWPORT_GRID_WIDTH: 8,
  GRID_SIZE: 150,
};