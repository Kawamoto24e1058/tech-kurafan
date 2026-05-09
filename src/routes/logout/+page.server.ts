import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies }) => {
  cookies.delete('session', { path: '/' });
  throw redirect(303, '/login');
};
