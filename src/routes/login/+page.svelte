<script lang="ts">
  import { clientAuth } from '$lib/firebase.client';
  import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

  let isLoading = false;
  let errorMessage = '';

  async function loginWithGoogle() {
    isLoading = true;
    errorMessage = '';
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(clientAuth, provider);
      const idToken = await result.user.getIdToken();

      // サーバーにセッションクッキーを発行してもらう
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'ログインに失敗しました');
      }

      // ホームへ
      window.location.href = '/';
    } catch (err: unknown) {
      const msg = (err as Error).message ?? 'ログインに失敗しました';
      // ポップアップを閉じた場合は無視
      if (!msg.includes('popup-closed')) {
        errorMessage = msg;
      }
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>ログイン — テック部クラファン</title>
</svelte:head>

<div class="min-h-screen bg-[#f5f5f7] flex flex-col items-center justify-center px-5">

  <div class="w-full max-w-sm">

    <!-- ロゴ / タイトル -->
    <div class="text-center mb-10">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-900 mb-5">
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="none"
          viewBox="0 0 24 24" stroke="white" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/>
        </svg>
      </div>
      <h1 class="text-[22px] font-bold text-gray-900 tracking-tight">テック部クラファン</h1>
      <p class="mt-1.5 text-[13px] text-gray-400">みんなで割り勘・共同購入</p>
    </div>

    <!-- ログインカード -->
    <div class="bg-white rounded-2xl px-6 py-7 shadow-sm">
      <p class="text-[14px] text-gray-600 text-center mb-6 leading-relaxed">
        Googleアカウントでログインして<br/>クラファンに参加しよう
      </p>

      {#if errorMessage}
        <p class="mb-4 text-[12px] text-red-500 text-center bg-red-50 rounded-xl px-4 py-3">
          {errorMessage}
        </p>
      {/if}

      <button
        on:click={loginWithGoogle}
        disabled={isLoading}
        class="w-full flex items-center justify-center gap-3 py-3.5 px-4
               bg-white border border-gray-200 rounded-xl
               text-[14px] font-medium text-gray-700
               hover:bg-gray-50 active:scale-[0.98]
               transition-all duration-150
               disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {#if isLoading}
          <svg class="animate-spin w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg"
            fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10"
              stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <span>ログイン中…</span>
        {:else}
          <!-- Google ロゴ -->
          <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          <span>Googleでログイン</span>
        {/if}
      </button>
    </div>

    <p class="mt-6 text-center text-[11px] text-gray-300 leading-relaxed">
      ログインすることで利用規約に同意したものとみなします
    </p>

  </div>
</div>
