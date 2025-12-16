import { 
  initializeApp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFunctions, 
  httpsCallable 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signOut,
  updateProfile,
  signInWithCustomToken,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ★追加: Firestore操作用
import { 
    getFirestore, 
    doc, 
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { FirebaseConfig } from "../../core/config/FirebaseConfig.js";
import { UserEntity } from "../../domain/auth/UserEntity.js";
export class FirebaseAuthAdapter {
  constructor() {
    console.log("[AuthAdapter] Initializing with config:", FirebaseConfig);
    this.app = initializeApp(FirebaseConfig);
    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app); 
    this.functions = getFunctions(this.app, "asia-northeast1");
    this.currentUserEntity = UserEntity.createGuest();
  }

  async getIdToken() {
    if (!this.auth.currentUser) throw new Error("Not logged in");
    return await this.auth.currentUser.getIdToken(true);
  }

  /**
   * [Step 5] 引継ぎコードの発行リクエスト
   */
  async issueTransferCode() {
    
    const issueFn = httpsCallable(this.functions, 'issueTransferCode');
    
    try {
      
      const result = await issueFn();
      
      return result.data.code;
    } catch (error) {
      console.error("Issue code failed:", error);
      throw error;
    }
  }

  /**
   * [Step 5] コードを使って復旧（カスタムトークンでログイン）
   */
  async recoverAccount(code) {
    // 【変更後】
    const recoverFn = httpsCallable(this.functions, 'recoverAccount');
    
    try {
      // コードを引数として渡す
      const result = await recoverFn({ code: code });
      
      const customToken = result.data.customToken;
      
      // カスタムトークンを使ってサインイン
      await signInWithCustomToken(this.auth, customToken);
      
      return true;
    } catch (error) {
      console.error("Recovery failed:", error);
      throw error;
    }
  }

observeAuthState(onUserChanged) {
    onAuthStateChanged(this.auth, async (firebaseUser) => {
      // --- 診断ログ (ここから) ---
      console.log("[AuthDebug] Auth State Changed:", firebaseUser ? "User Found" : "No User");
      if (firebaseUser) {
        console.log("[AuthDebug] UID:", firebaseUser.uid);
        console.log("[AuthDebug] DisplayName (Raw):", firebaseUser.displayName);
        console.log("[AuthDebug] isAnonymous:", firebaseUser.isAnonymous);
      }
      // --- 診断ログ (ここまで) ---

      if (firebaseUser) {
        // 名前がない場合の再ロード試行チェックポイント
        if (!firebaseUser.displayName) {
            console.log("[AuthDebug] DisplayName is missing. Reloading profile...");
            try {
                await firebaseUser.reload();
                console.log("[AuthDebug] Reloaded DisplayName:", firebaseUser.displayName);
            } catch (e) {
                console.warn("[Auth] Profile reload failed:", e);
            }
        }

        const name = firebaseUser.displayName || "Guest";
        // 名前が "Guest" でなければメンバーとみなす
        const isGuest = name === "Guest"; 
        
        console.log(`[AuthDebug] Final Decision -> Name: ${name}, isGuest: ${isGuest}`);

        this.currentUserEntity = isGuest 
          ? new UserEntity(firebaseUser.uid, "Guest", true)
          : UserEntity.createMember(firebaseUser.uid, name);
          
      } else {
        this.currentUserEntity = null;
      }
      onUserChanged(this.currentUserEntity);
    });
  }
  /**
   * ゲストとしてログイン (匿名認証)
   */
  async loginAsGuest() {
    try {
      const result = await signInAnonymously(this.auth);
      
      if (!result.user.displayName) {
        await updateProfile(result.user, { displayName: "Guest" });
      }
      return result.user;
    } catch (error) {
      console.error("[Auth] Guest login failed:", error);
      throw error;
    }
  }

  /**
   * プレイヤー名の登録（ゲストからの昇格）
   */
  async registerName(name) {
    const user = this.auth.currentUser;
    if (!user) throw new Error("No user logged in.");
    
    try {
      await updateProfile(user, { displayName: name });
      
      return true;
    } catch (error) {
      console.error("[Auth] Name registration failed:", error);
      throw error;
    }
  }

  /**
   * ログアウト
   */
  async logout() {
    await signOut(this.auth);
  }

  /**
   * アカウントとデータの完全削除
   */
  async deleteAccount() {
    const user = this.auth.currentUser;
    if (user) {
      
      try {
        const userDocRef = doc(this.db, "ranking", user.uid);
        await deleteDoc(userDocRef);
        console.log("[Auth] Firestore data deleted.");
      } catch (dbError) {
        console.warn("[Auth] Failed to delete Firestore data (might not exist or permission denied):", dbError);
        
      }

      
      await deleteUser(user);
      console.log("[Auth] User deleted.");
    }
  }
}