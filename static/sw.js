// ── テック部クラファン Service Worker ──────────────────────────────────────
// PWA キャッシュ + Firebase Cloud Messaging（バックグラウンド通知）を一本化

// 1. Firebase SDKs を先にロード（background messaging に必要）
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// 2. Firebase 初期化（PUBLIC値なのでハードコード可）
firebase.initializeApp({
  apiKey:            'AIzaSyD8f8Vx_Yu6z5S8QQTB41tf26GMucGjlH0',
  authDomain:        'tech-kurafan.firebaseapp.com',
  projectId:         'tech-kurafan',
  messagingSenderId: '316738726094',
  appId:             '1:316738726094:web:e7e2230e2339dd06b7c89f',
});

const messaging = firebase.messaging();

// 3. バックグラウンド通知を受け取る
messaging.onBackgroundMessage((payload) => {
  const n    = payload.notification ?? {};
  const data = payload.data ?? {};
  self.registration.showNotification(n.title ?? data['title'] ?? 'テック部クラファン', {
    body:  n.body ?? data['body'] ?? '',
    icon:  '/icon-192.png',
    badge: '/icon-192.png',
    data:  { url: data['url'] ?? '/' },
  });
});

// 4. 通知クリック
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

// ── PWA キャッシュ ───────────────────────────────────────────────────────────

const CACHE = 'kurafan-v1';

// インストール時にオフラインフォールバックをキャッシュ
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(['/', '/login']))
  );
});

// 古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ネットワーク優先・失敗時はキャッシュから返す
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // API・外部リクエストはスキップ
  if (!event.request.url.startsWith(self.location.origin)) return;
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then(res => {
        // ページはキャッシュに保存しておく
        if (res.ok && event.request.mode === 'navigate') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
