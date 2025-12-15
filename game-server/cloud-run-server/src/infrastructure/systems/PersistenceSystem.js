import { FieldValue } from "firebase-admin/firestore";

/**
 * 永続化（DB保存）システム
 */
export class PersistenceSystem {
  constructor(firestore) {
    this.firestore = firestore;
  }

  async saveScore(userId, name, score) {
    if (!this.firestore) return;
    const finalScore = Math.round(score);
    if (finalScore <= 0) return;

    const rankDocRef = this.firestore.collection("ranking").doc(userId);
    try {
      await this.firestore.runTransaction(async (transaction) => {
        const docSnapshot = await transaction.get(rankDocRef);
        const currentData = docSnapshot.data();
        const currentHighScore = currentData && currentData.highScore ? currentData.highScore : 0;

        if (finalScore > currentHighScore) {
          transaction.set(rankDocRef, {
            uid: userId,
            name: name,
            highScore: finalScore,
            lastPlayed: FieldValue.serverTimestamp(),
          }, { merge: true });
        } else if (docSnapshot.exists) {
            transaction.update(rankDocRef, {
              lastPlayed: FieldValue.serverTimestamp(),
            });
        }
      });
    } catch (error) {
      console.error(`[Persistence] Failed to save score:`, error);
    }
  }
}