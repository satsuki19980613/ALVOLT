import { SessionMonitor } from "../services/SessionMonitor.js";

export class AccountManager {
  constructor(authAdapter) {
    this.auth = authAdapter;
    this.currentUser = null;
    this.onUserUpdated = null;

    this.sessionMonitor = new SessionMonitor(this.auth);
  }

  init(onUserUpdatedCallback) {
    this.onUserUpdated = onUserUpdatedCallback;
    this.auth.observeAuthState(async (userEntity) => {
      if (userEntity) {
        this.sessionMonitor.start();
      } else {
        this.sessionMonitor.stop();
      }

      this.currentUser = userEntity;
      if (this.onUserUpdated) {
        this.onUserUpdated(userEntity);
      }
    });
  }

  async loginGuest() {
    return await this.auth.loginAsGuest();
  }

  async registerPlayerName(name) {
    if (!name || name.length > 10) {
      throw new Error("Invalid name length");
    }

    if (!this.auth.auth.currentUser) {
      console.log(
        "[AccountManager] No user found. Creating guest account first..."
      );
      await this.auth.loginAsGuest();
    }

    await this.auth.registerName(name);

    location.reload();
  }

  async issueCode() {
    return await this.auth.issueTransferCode();
  }

  async recover(code) {
    if (!code || code.length < 4) throw new Error("Invalid code format");

    this.sessionMonitor.stop();

    await this.auth.recoverAccount(code);
  }

  async deleteUser() {
    try {
      await this.auth.deleteAccount();
      alert("アカウントとデータを削除しました。");
      location.reload();
    } catch (error) {
      console.error("Delete failed:", error);
      if (error.code === "auth/requires-recent-login") {
        alert(
          "セキュリティ保護のため、再ログインが必要です。ページをリロードしますので、もう一度削除操作を行ってください。"
        );
        await this.auth.logout();
        location.reload();
      } else {
        alert("削除中にエラーが発生しました: " + error.message);
        location.reload();
      }
    }
  }
}
