<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  // テンプレート内で as any を使えないため変数で受ける
  $: formMessage = (form as { message?: string } | null)?.message ?? '';
  $: formSuccess = !!(form as { success?: boolean } | null)?.success;

  let displayName = data.displayName;
  let isSubmitting = false;
</script>

<svelte:head>
  <title>プロフィール — テック部クラファン</title>
</svelte:head>

<div class="min-h-screen bg-[#f5f5f7]">

  <header class="bg-white/90 backdrop-blur-xl border-b border-black/[0.06] sticky top-0 z-20">
    <div class="max-w-2xl mx-auto px-5 h-14 flex items-center gap-3">
      <a href="/" class="text-gray-400 hover:text-gray-600 transition-colors" aria-label="戻る">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
          viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
        </svg>
      </a>
      <h1 class="text-[15px] font-semibold text-gray-900 tracking-tight">プロフィール</h1>
    </div>
  </header>

  <main class="max-w-2xl mx-auto px-5 py-8 space-y-4">

    <!-- アバター -->
    <div class="bg-white rounded-2xl px-5 py-6 flex items-center gap-4">
      <div class="w-14 h-14 rounded-full bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
        {#if data.photoURL}
          <img src={data.photoURL} alt={data.displayName} class="w-full h-full object-cover"/>
        {:else}
          <span class="text-[20px] font-bold text-gray-400">{data.displayName.charAt(0)}</span>
        {/if}
      </div>
      <div>
        <p class="text-[15px] font-semibold text-gray-900">{data.displayName}</p>
        <p class="text-[12px] text-gray-400 mt-0.5">{data.email}</p>
      </div>
    </div>

    <!-- 編集フォーム -->
    <form
      method="POST"
      use:enhance={() => {
        isSubmitting = true;
        return async ({ update }) => { await update(); isSubmitting = false; };
      }}
      class="bg-white rounded-2xl overflow-hidden"
    >
      <div class="px-5 py-4">
        <label for="displayName"
          class="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          表示名
        </label>
        <input id="displayName" name="displayName" type="text"
          bind:value={displayName}
          maxlength="30"
          placeholder="テック部での表示名"
          class="w-full text-[15px] text-gray-900 placeholder-gray-300 bg-transparent border-none outline-none"
          required />
      </div>

      {#if formMessage}
        <p class="px-5 pb-3 text-[12px] text-red-500">{formMessage}</p>
      {/if}

      {#if formSuccess}
        <div class="mx-5 mb-4 bg-green-50 rounded-xl px-4 py-3">
          <p class="text-[12px] font-medium text-green-600">✓ 表示名を更新しました</p>
        </div>
      {/if}

      <div class="px-5 pb-5">
        <button type="submit" disabled={isSubmitting}
          class="w-full py-3.5 rounded-xl bg-gray-900 text-white text-[14px] font-semibold
                 hover:bg-gray-700 active:scale-[0.98]
                 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
          {isSubmitting ? '保存中…' : '変更を保存する'}
        </button>
      </div>
    </form>

    <!-- ログアウト -->
    <a href="/logout"
      class="block w-full text-center py-3.5 rounded-2xl border border-gray-200 bg-white
             text-[14px] text-red-500 font-medium hover:bg-red-50 transition-colors">
      ログアウト
    </a>

  </main>
</div>
