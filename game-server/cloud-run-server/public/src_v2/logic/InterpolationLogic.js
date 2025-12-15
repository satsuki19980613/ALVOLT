import { ClientConfig } from "../core/config/ClientConfig.js";
/**
 * 座標補間（Lerp）計算ロジック
 */
export const InterpolationLogic = {
  calculateNextPosition(current, target, deltaFrames) {
    const rate = ClientConfig.CLIENT_LERP_RATE;
    const adjust = 1 - Math.pow(1 - rate, deltaFrames);
    const next = current + (target - current) * adjust;
    
    if (Math.abs(target - next) < 0.1) {
      return target;
    }
    return next;
  },

  calculateNextAngle(current, target, deltaFrames) {
    let delta = target - current;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    
    const rate = 0.1; 
    const rotAdjust = 1 - Math.pow(1 - rate, deltaFrames);
    return current + delta * rotAdjust;
  }
};