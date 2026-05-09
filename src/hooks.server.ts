import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { adminAuth, isFirebaseConfigured } from '$lib/server/firebase-admin';
import { db } from '$lib/server/db';

// ADMIN_UIDS=uid1,uid2 形式で管理者を指定（未設定時はモックユーザーを管理者扱い）
import { ADMIN_UIDS } from '$env/static/private';
const ADMIN_SET = new Set((ADMIN_UIDS ?? '').split(',').map(s => s.trim()).filter(Boolean));

export const handle: Handle = async ({ event, resolve }) => {

  if (isFirebaseConfigured) {
    // ── 本番：Firebase セッションクッキーを検証 ──────────────────
    const sessionCookie = event.cookies.get('session');
    if (sessionCookie) {
      try {
        const decoded = await adminAuth!.verifySessionCookie(sessionCookie, true);

        // Firestore の users コレクションから表示名を取得（プロフィール編集対応）
        const profile = await db.users.get(decoded.uid);
        event.locals.user = {
          uid:         decoded.uid,
          displayName: profile?.displayName ?? (decoded.name as string | undefined) ?? decoded.email ?? 'メンバー',
          email:       decoded.email ?? '',
          photoURL:    profile?.photoURL ?? (decoded.picture as string | undefined) ?? null,
        };
      } catch {
        event.cookies.delete('session', { path: '/' });
        event.locals.user = null;
      }
    } else {
      event.locals.user = null;
    }

    const path = event.url.pathname;
    const isPublicPath =
      path === '/login' ||
      path.startsWith('/api/session') ||
      path.startsWith('/api/cron/') ||          // Vercel Cron（独自認証）
      path === '/firebase-messaging-sw.js';      // Service Worker（認証不要）
    if (!event.locals.user && !isPublicPath) {
      throw redirect(303, '/login');
    }

  } else {
    // ── ローカル開発：モックユーザー ─────────────────────────────
    const profile = await db.users.get('mock-user-001');
    event.locals.user = {
      uid:         'mock-user-001',
      displayName: profile?.displayName ?? '田中 健太（開発用）',
      email:       'dev@example.com',
      photoURL:    null,
    };
  }

  // 管理者フラグ（ローカルはモックユーザーを常に管理者扱い）
  event.locals.isAdmin = event.locals.user
    ? (isFirebaseConfigured ? ADMIN_SET.has(event.locals.user.uid) : true)
    : false;

  return resolve(event);
};
