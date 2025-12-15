import { ObstacleState } from "../../domain/ObstacleState.js";

export class MapLoader {
  static loadMapData(worldState, mapData) {
    if (!mapData.definitions && mapData.obstacles && !Array.isArray(mapData.obstacles)) {
      mapData = mapData.obstacles;
    }

    worldState.width = (mapData.worldSize && mapData.worldSize.width) || 3000;
    worldState.height = (mapData.worldSize && mapData.worldSize.height) || 3000;

    let obstacleConfigs = [];
    if (mapData.definitions && mapData.placements) {
      obstacleConfigs = mapData.placements.map((placement) => {
          const def = mapData.definitions[placement.defId];
          if (!def) return null;
          return {
            ...def,
            ...placement,
            id: placement.id || `obs_${Math.random().toString(36).substr(2, 9)}`,
          };
        }).filter(Boolean);
    } else if (mapData.obstacles) {
      obstacleConfigs = mapData.obstacles;
    }

    worldState.obstacles = obstacleConfigs.map((obsData) => {
        if (obsData.type === "obstacle_wall" || obsData.type === "WALL") {
          const obs = new ObstacleState(
            obsData.x,
            obsData.y,
            obsData.width,
            obsData.height,
            "obstacle_wall",
            obsData.borderRadius || 0,
            obsData.individualRadii || {},
            obsData.rotation || 0,
            obsData.className
          );
          
          if (Array.isArray(obsData.colliders)) {
             obs.colliders = obsData.colliders.filter(c => c.type === "rect");
             
             let maxDist = 0;
             for (const c of obs.colliders) {
                 const dist = Math.sqrt((c.x || 0) ** 2 + (c.y || 0) ** 2);
                 const diag = Math.sqrt(c.w * c.w + c.h * c.h) / 2;
                 if (dist + diag > maxDist) maxDist = dist + diag;
             }
             obs.maxColliderRadius = maxDist;
          }

          return obs;
        }
        return null;
      }).filter(Boolean);

    worldState.playerSpawns = mapData.playerSpawns || [{ x: 500, y: 500 }];
    worldState.enemySpawns = mapData.enemySpawns || [{ x: 1500, y: 1500 }];
  }
}