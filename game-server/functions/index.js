const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2/options");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// 【重要】ここで全関数のリージョンを「東京」に固定します
setGlobalOptions({ region: "asia-northeast1" });

// ---------------------------------------------------------
// 1. 引継ぎコードの発行 (Issue Transfer Code) - V2
// ---------------------------------------------------------
// onCall の引数が (data, context) から (request) 1つに変わります
exports.issueTransferCode = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const uid = request.auth.uid;
  
  // 6桁のコード生成
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24時間有効

  try {
    await db.collection("transfer_codes").doc(code).set({
      uid: uid,
      createdAt: Date.now(),
      expiresAt: expiresAt,
    });

    console.log(`[Transfer] Code issued for ${uid}: ${code}`);
    return { code: code };
    
  } catch (error) {
    console.error("[Transfer] Issue failed:", error);
    throw new HttpsError("internal", "Failed to issue code.");
  }
});

// ---------------------------------------------------------
// 2. 引継ぎの実行 (Recover Account) - V2
// ---------------------------------------------------------
exports.recoverAccount = onCall({ cors: true }, async (request) => {
  // data は request.data になります
  const code = request.data.code;

  if (!code) {
    throw new HttpsError("invalid-argument", "Code is required.");
  }

  try {
    const docRef = db.collection("transfer_codes").doc(code.toUpperCase());
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new HttpsError("not-found", "Invalid code.");
    }

    const record = doc.data();
    if (record.expiresAt < Date.now()) {
      throw new HttpsError("cancelled", "Code expired.");
    }

    const targetUid = record.uid;

    // 古いセッションの無効化
    await admin.auth().revokeRefreshTokens(targetUid);

    // カスタムトークン発行
    const customToken = await admin.auth().createCustomToken(targetUid);

    // 使用済みコード削除
    await docRef.delete();

    console.log(`[Transfer] Recovery successful for ${targetUid}`);
    return { customToken: customToken };

  } catch (error) {
    console.error("[Transfer] Recover failed:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Recovery failed.");
  }
});