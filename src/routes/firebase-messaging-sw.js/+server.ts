/**
 * Firebase Messaging Service Worker を動的に配信するエンドポイント
 * 環境変数を SW に埋め込むためにルートとして実装
 * → /firebase-messaging-sw.js として配信される
 */

import {
  PUBLIC_FIREBASE_API_KEY,
  PUBLIC_FIREBASE_AUTH_DOMAIN,
  PUBLIC_FIREBASE_PROJECT_ID,
  PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  PUBLIC_FIREBASE_APP_ID,
} from '$env/static/public';

export const GET = () => {
  const sw = `
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "${PUBLIC_FIREBASE_API_KEY}",
  authDomain:        "${PUBLIC_FIREBASE_AUTH_DOMAIN}",
  projectId:         "${PUBLIC_FIREBASE_PROJECT_ID}",
  messagingSenderId: "${PUBLIC_FIREBASE_MESSAGING_SENDER_ID}",
  appId:             "${PUBLIC_FIREBASE_APP_ID}",
});

const messaging = firebase.messaging();

// バックグラウンドでプッシュを受け取った時
messaging.onBackgroundMessage((payload) => {
  const n    = payload.notification ?? {};
  const data = payload.data ?? {};
  const title = n.title ?? data.title ?? 'テック部クラファン';
  const body  = n.body  ?? data.body  ?? '';
  const url   = data.url ?? '/';

  self.registration.showNotification(title, {
    body,
    icon:  '/favicon.png',
    badge: '/favicon.png',
    data:  { url },
  });
});

// 通知をクリックした時
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
`.trim();

  return new Response(sw, {
    headers: {
      'Content-Type':          'application/javascript; charset=utf-8',
      'Service-Worker-Allowed': '/',
      'Cache-Control':          'no-cache',
    },
  });
};
