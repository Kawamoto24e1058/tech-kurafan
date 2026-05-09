/**
 * Firebase クライアント SDK 初期化（ブラウザ専用）
 * Googleログイン・FCMプッシュ通知に使用します。
 * NOTE: このモジュールはブラウザでのみ実行されます（SSR時はスキップ）。
 */

import { browser } from '$app/environment';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

import {
  PUBLIC_FIREBASE_API_KEY,
  PUBLIC_FIREBASE_AUTH_DOMAIN,
  PUBLIC_FIREBASE_PROJECT_ID,
  PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  PUBLIC_FIREBASE_APP_ID,
  PUBLIC_FIREBASE_VAPID_KEY,
} from '$env/static/public';

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

if (browser) {
  const firebaseConfig = {
    apiKey:            PUBLIC_FIREBASE_API_KEY,
    authDomain:        PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId:         PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId:             PUBLIC_FIREBASE_APP_ID,
  };
  _app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  _auth = getAuth(_app);
}

export const clientAuth = _auth as Auth;

/**
 * 通知許可を求めてFCMトークンを取得し、サーバーに登録する
 * @returns 登録できたか
 */
export async function registerPushNotifications(): Promise<boolean> {
  if (!browser || !_app) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    // SW を登録
    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    });

    const { getMessaging, getToken } = await import('firebase/messaging');
    const messaging = getMessaging(_app);
    const token = await getToken(messaging, {
      vapidKey: PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    if (!token) return false;

    // サーバーに保存
    await fetch('/api/push/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    });

    return true;
  } catch (err) {
    console.error('[FCM] registerPushNotifications error:', err);
    return false;
  }
}

/**
 * フォアグラウンドでも通知を受け取るリスナーを設定
 */
export async function setupForegroundNotifications() {
  if (!browser || !_app) return;
  try {
    const { getMessaging, onMessage } = await import('firebase/messaging');
    const messaging = getMessaging(_app);
    onMessage(messaging, (payload) => {
      const n     = payload.notification ?? {};
      const data  = payload.data ?? {};
      const title = n.title ?? data['title'] ?? 'テック部クラファン';
      const body  = n.body  ?? data['body']  ?? '';
      const url   = data['url'] ?? '/';
      // ブラウザのネイティブ通知を表示
      if (Notification.permission === 'granted') {
        const notif = new Notification(title, { body, icon: '/favicon.png' });
        notif.onclick = () => { window.focus(); window.location.href = url; };
      }
    });
  } catch (err) {
    console.error('[FCM] setupForegroundNotifications error:', err);
  }
}
