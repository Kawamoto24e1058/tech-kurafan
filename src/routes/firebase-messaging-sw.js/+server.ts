/**
 * Firebase Messaging Service Worker を動的に配信するエンドポイント
 * 環境変数を SW に埋め込むためにルートとして実装
 * → /firebase-messaging-sw.js として配信される
 */

export const GET = () => {
  // process.env で取得（$env/static/public の Rollup 解決問題を回避）
  const apiKey            = process.env['PUBLIC_FIREBASE_API_KEY']            ?? '';
  const authDomain        = process.env['PUBLIC_FIREBASE_AUTH_DOMAIN']        ?? '';
  const projectId         = process.env['PUBLIC_FIREBASE_PROJECT_ID']         ?? '';
  const messagingSenderId = process.env['PUBLIC_FIREBASE_MESSAGING_SENDER_ID'] ?? '';
  const appId             = process.env['PUBLIC_FIREBASE_APP_ID']             ?? '';

  const sw = `
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "${apiKey}",
  authDomain:        "${authDomain}",
  projectId:         "${projectId}",
  messagingSenderId: "${messagingSenderId}",
  appId:             "${appId}",
});

const messaging = firebase.messaging();

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
      'Content-Type':           'application/javascript; charset=utf-8',
      'Service-Worker-Allowed': '/',
      'Cache-Control':          'no-cache',
    },
  });
};
