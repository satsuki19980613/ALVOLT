export class ModalManager {
  constructor(uiRenderer) {
    this.uiRenderer = uiRenderer;
    this.modals = {
      register: document.getElementById("modal-register"),
      transfer: document.getElementById("modal-transfer"),
    };
  }

  open(modalType) {
    this.closeAll();
    if (this.modals[modalType]) {
      this.modals[modalType].classList.remove("hidden");
      this.uiRenderer.setOverlay("modal");
    }
  }

  closeAll() {
    Object.values(this.modals).forEach(el => el && el.classList.add("hidden"));
    this.uiRenderer.setOverlay(null);
  }
}