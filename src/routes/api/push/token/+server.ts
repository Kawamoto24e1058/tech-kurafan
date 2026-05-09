import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

/** FCMトークンを登録 */
export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: 'unauthorized' }, { status: 401 });
  const { token } = await request.json() as { token: string };
  if (!token) return json({ error: 'token required' }, { status: 400 });
  await db.pushTokens.save(locals.user.uid, token);
  return json({ ok: true });
};

/** FCMトークンを削除（通知オフ） */
export const DELETE: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: 'unauthorized' }, { status: 401 });
  const { token } = await request.json() as { token: string };
  if (!token) return json({ error: 'token required' }, { status: 400 });
  await db.pushTokens.remove(token);
  return json({ ok: true });
};
