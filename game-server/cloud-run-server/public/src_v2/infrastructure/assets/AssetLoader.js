export class AssetLoader {
  constructor() {
    this.loadedCount = 0;
  }

  async loadAudioPlaylist(playlist, onProgress) {
    this.loadedCount = 0;
    const totalCount = playlist.length;

    for (const track of playlist) {
      try {
        const response = await fetch(track.url);
        if (!response.ok) throw new Error(`Failed to load ${track.title}`);

        const blob = await response.blob();
        track.blobUrl = URL.createObjectURL(blob);
      } catch (e) {
        console.warn(`Pre-fetch failed for ${track.title}`, e);
      }

      this.loadedCount++;
      const percent = (this.loadedCount / totalCount) * 100;

      if (onProgress) {
        onProgress(percent);
      }

      await new Promise((r) => setTimeout(r, 10));
    }
  }

  async loadSpriteAssets(config) {
    console.log("[AssetLoader] Loading sprites...");
    const bundles = [];

    const cacheBuster = `?v=${Date.now()}`;

    for (const [key, path] of Object.entries(config.ASSETS)) {
      const fullUrl = `${config.BASE_URL}/${path}${cacheBuster}`;

      PIXI.Assets.add({ alias: key, src: fullUrl });
      bundles.push(key);
    }

    try {
      await PIXI.Assets.load(bundles);
      console.log("[AssetLoader] All sprite assets loaded.");
    } catch (e) {
      console.error("[AssetLoader] Failed to load sprite assets:", e);
    }
  }
}
