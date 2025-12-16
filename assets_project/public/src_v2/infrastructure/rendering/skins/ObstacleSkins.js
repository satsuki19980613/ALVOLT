import { HexagonFortressSkin } from './obstacles/HexagonFortress.js';
import { LongCornerMagentaSkin } from './obstacles/LongCornerMagenta.js';
import { WideNeonSkin } from './obstacles/WideNeon.js';
import { UShapeHangarSkin } from './obstacles/UShapeHangar.js';
import { LongCrossSkin } from './obstacles/LongCross.js';
import { StandardCyberSkin } from './obstacles/StandardCyber.js';
import { NeonRoadCurveSkin } from './obstacles/NeonRoadCurveSkin.js';       
import { NeonRoadStraightSkin } from './obstacles/NeonRoadStraightSkin.js';

export const ObstacleSkins = {
  'obs-hexagon-fortress-animated': (progress) => HexagonFortressSkin(progress, '#00ffea'),
  'obs-long-corner': (progress) => LongCornerMagentaSkin(progress),
  'obs-wide-neon': (progress) => WideNeonSkin(progress),
  'obs-ushape-hangar': (progress) => UShapeHangarSkin(progress),
  'obs-long-cross': (progress) => LongCrossSkin(progress),
  'obs-standard-cyber': (progress) => StandardCyberSkin(progress),
  'obs-road-curve': (progress) => NeonRoadCurveSkin(false),
  'obs-road-curve-flipped': (progress) => NeonRoadCurveSkin(true),
  'obs-road-straight': (progress) => NeonRoadStraightSkin(),
  
  default: (ctx, w, h) => {
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(0, 0, w, h);
  },
};
