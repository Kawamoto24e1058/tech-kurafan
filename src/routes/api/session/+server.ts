import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminAuth } from '$lib/server/firebase-admin';

const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000; // 5日

/** Googleログイン後に呼ばれる: ID トークン → セッションクッキー発行 */
export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const { idToken } = await request.json();
    if (!idToken) return json({ message: 'idToken が必要です' }, { status: 400 });

    // ID トークンを検証してセッションクッキーを生成
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    });

    cookies.set('session', sessionCookie, {
      path:     '/',
      httpOnly: true,
      secure:   true,
      sameSite: 'lax',
      maxAge:   SESSION_DURATION_MS / 1000,
    });

    return json({ ok: true });
  } catch (err) {
    console.error('session create error:', err);
    return json({ message: 'ログインに失敗しました' }, { status: 401 });
  }
};

/** ログアウト */
export const DELETE: RequestHandler = async ({ cookies }) => {
  cookies.delete('session', { path: '/' });
  return json({ ok: true });
};
