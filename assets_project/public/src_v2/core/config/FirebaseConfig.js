import { ENV } from './env.js';

// 今いる場所が "alvolt-dev" か "localhost" なら「開発環境」とみなす
const isDev = location.hostname.includes("alvolt-dev") || location.hostname.includes("localhost");

// 環境に合わせて使う設定セットを選ぶ
const activeConfig = isDev ? ENV.DEV : ENV.OFFICIAL;

// 選んだ設定をそのままエクスポートする
export const FirebaseConfig = {
    apiKey: activeConfig.apiKey,
    authDomain: activeConfig.authDomain,
    projectId: activeConfig.projectId,
    storageBucket: activeConfig.storageBucket,
    messagingSenderId: activeConfig.messagingSenderId,
    appId: activeConfig.appId
};