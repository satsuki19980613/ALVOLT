/**
 * 描画システムのインターフェース定義
 */
export class IRenderer {
  render(viewModels) {
    throw new Error("Method 'render' must be implemented.");
  }
  resize(width, height) {
    throw new Error("Method 'resize' must be implemented.");
  }
}