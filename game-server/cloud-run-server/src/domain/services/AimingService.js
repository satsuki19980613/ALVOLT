import { PlayerLogic } from "../../logic/PlayerLogic.js";
import { GameConstants } from "../../core/constants/GameConstants.js";

export class AimingService {
  static determineShootAngle(player, physicsSystem) {
    const aimRadius = GameConstants.GRID_CELL_SIZE * 5;

    const nearby = physicsSystem.grid.getNearbyWithRadius(player, aimRadius);

    const autoAimAngle = PlayerLogic.calculateAutoAimAngle(
      player,
      nearby,
      aimRadius
    );

    if (autoAimAngle !== null) {
      return autoAimAngle;
    }

    return player.angle;
  }
}
