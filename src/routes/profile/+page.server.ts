import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw error(401, 'ログインが必要です');
  const profile = await db.users.get(locals.user.uid);
  return {
    displayName: profile?.displayName ?? locals.user.displayName,
    email:       locals.user.email,
    photoURL:    locals.user.photoURL,
  };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { message: 'ログインが必要です' });

    const data        = await request.formData();
    const displayName = (data.get('displayName') as string | null)?.trim() ?? '';

    if (!displayName || displayName.length < 1) {
      return fail(400, { message: '表示名を入力してください' });
    }
    if (displayName.length > 30) {
      return fail(400, { message: '表示名は30文字以内にしてください' });
    }

    await db.users.upsert(locals.user.uid, { displayName });

    return { success: true };
  },
};
