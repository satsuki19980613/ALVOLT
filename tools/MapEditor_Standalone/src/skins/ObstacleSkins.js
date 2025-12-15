import { NeonCrateSkin } from "./obstacles/NeonCrate.js";

export const ObstacleSkins = {
  "obs-neon-crate": NeonCrateSkin("#00e5ff"),

  default: (ctx, w, h) => {
    ctx.fillStyle = "#333";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#fff";
    ctx.strokeRect(0, 0, w, h);
  },
};
