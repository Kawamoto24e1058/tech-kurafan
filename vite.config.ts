import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  ssr: {
    // firebase-admin は Node.js 専用パッケージなので SSR バンドルから外す
    external: [
      'firebase-admin', 'firebase-admin/app', 'firebase-admin/auth',
      'firebase-admin/firestore', 'firebase-admin/messaging',
      'firebase', 'firebase/app', 'firebase/auth', 'firebase/messaging',
    ],
  },
});
