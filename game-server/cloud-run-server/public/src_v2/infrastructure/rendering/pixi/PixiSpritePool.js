export class PixiSpritePool {
  constructor() {
    this.pools = new Map();
  }

  /**
   * プールからオブジェクトを取得する
   * @param {string} key - オブジェクトの種類識別子 (例: "bullet_enemy")
   * @param {Function} factoryFn - プールが空のときに新規作成する関数
   */
  get(key, factoryFn) {
    if (!this.pools.has(key)) {
      this.pools.set(key, []);
    }

    const pool = this.pools.get(key);

    if (pool.length > 0) {
      const item = pool.pop();

      return item;
    }

    return factoryFn();
  }

  /**
   * 使い終わったオブジェクトをプールに戻す
   * @param {string} key - オブジェクトの種類識別子
   * @param {Object} item - 戻すオブジェクト (visual wrapper)
   */
  returnObject(key, item) {
    if (!this.pools.has(key)) {
      this.pools.set(key, []);
    }

    this.pools.get(key).push(item);
  }
}
