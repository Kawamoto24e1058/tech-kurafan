/**
 * Firebase クライアント SDK 初期化（ブラウザ専用）
 * Googleログイン・FCMプッシュ通知に使用します。
 * NOTE: このモジュールはブラウザでのみ実行されます（SSR時はスキップ）。
 */

import { browser } from '$app/environment';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

// PUBLIC値はブラウザにも公開されるため直接記述（$env/static/public の Rollup 解決問題を回避）
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyD8f8Vx_Yu6z5S8QQTB41tf26GMucGjlH0',
  authDomain:        'tech-kurafan.firebaseapp.com',
  projectId:         'tech-kurafan',
  messagingSenderId: '316738726094',
  appId:             '1:316738726094:web:e7e2230e2339dd06b7c89f',
};
const VAPID_KEY = 'BMxPqbOoed5xy5TxMIY8pU3BQzuLHALe882rXXkrUVbJEsw9R4fgzuxC8PZVAsNodtk8eBLQ8rNL5C0OwX_1YYU';

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

if (browser) {
  const firebaseConfig = FIREBASE_CONFIG;
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

    // layout.svelte で登録済みの sw.js を使う（FCM + PWA キャッシュを一本化）
    const swReg = await navigator.serviceWorker.ready;

    const { getMessaging, getToken } = await import('firebase/messaging');
    const messaging = getMessaging(_app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
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
