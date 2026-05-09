import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

// すでにログイン済みならホームへ
export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) throw redirect(303, '/');
};
