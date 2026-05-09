<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  let values = {
    title:       (form?.values?.title       ?? data.item.title)        as string,
    description: (form?.values?.description ?? data.item.description)  as string,
    totalCost:   (form?.values?.totalCost   ?? data.item.totalCost)    as number,
    minCount:    (form?.values?.minCount    ?? data.item.targetCount)  as number,
    deadline:    (form?.values?.deadline    ?? data.item.deadline)     as string,
  };

  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 16);

  $: costNum   = parseInt(String(values.totalCost), 10);
  $: countNum  = parseInt(String(values.minCount), 10);
  $: perPerson = (!isNaN(costNum) && !isNaN(countNum) && countNum > 0)
    ? Math.ceil(costNum / countNum) : null;

  function formatYen(n: number) {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n);
  }

  // 画像管理
  let imagePreview  = data.item.imageURL ?? '';   // 既存画像
  let clearImage    = false;
  let fileInput: HTMLInputElement;

  function handleImage(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    clearImage = false;
    const reader = new FileReader();
    reader.onload = (ev) => { imagePreview = ev.target?.result as string; };
    reader.readAsDataURL(file);
  }
  function removeImage() {
    imagePreview = '';
    clearImage = true;
    if (fileInput) fileInput.value = '';
  }

  let isSubmitting = false;
</script>

<svelte:head>
  <title>編集：{data.item.title} — テック部クラファン</title>
</svelte:head>

<div class="min-h-screen bg-[#f5f5f7]">

  <header class="bg-white/90 backdrop-blur-xl border-b border-black/[0.06] sticky top-0 z-20">
    <div class="max-w-2xl mx-auto px-5 h-14 flex items-center gap-3">
      <a href="/items/{data.item.id}" class="text-gray-400 hover:text-gray-600 transition-colors" aria-label="戻る">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
          viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
        </svg>
      </a>
      <h1 class="text-[15px] font-semibold text-gray-900 tracking-tight">内容を編集</h1>
    </div>
  </header>

  <main class="max-w-2xl mx-auto px-5 py-8">

    <div class="mb-4 flex items-start gap-2.5 bg-amber-50 rounded-2xl px-4 py-3.5">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"
        viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
        class="text-amber-500 shrink-0 mt-0.5">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
      </svg>
      <p class="text-[12px] text-amber-700 leading-relaxed">
        金額・人数を変更すると、すでに賛同した部員に影響が出る場合があります。変更前に周知しましょう。
      </p>
    </div>

    <form
      method="POST"
      enctype="multipart/form-data"
      use:enhance={() => {
        isSubmitting = true;
        return async ({ update }) => { await update(); isSubmitting = false; };
      }}
      class="space-y-4"
    >
      <!-- clearImage フラグ（hidden） -->
      <input type="hidden" name="clearImage" value={clearImage} />

      <!-- ── アイテム情報 ── -->
      <div class="bg-white rounded-2xl divide-y divide-gray-100 overflow-hidden">

        <div class="px-5 py-4">
          <label for="title" class="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            アイテム名
          </label>
          <input id="title" name="title" type="text"
            bind:value={values.title}
            class="w-full text-[15px] text-gray-900 bg-transparent border-none outline-none"
            required />
          {#if form?.errors?.title}
            <p class="mt-1.5 text-[12px] text-red-500">{form.errors.title}</p>
          {/if}
        </div>

        <div class="px-5 py-4">
          <label for="description" class="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            購入理由
          </label>
          <textarea id="description" name="description"
            bind:value={values.description}
            rows="3"
            class="w-full text-[14px] text-gray-900 leading-relaxed bg-transparent border-none outline-none resize-none"
            required />
          {#if form?.errors?.description}
            <p class="mt-1 text-[12px] text-red-500">{form.errors.description}</p>
          {/if}
        </div>

        <!-- 画像 -->
        <div class="px-5 py-4">
          <p class="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">画像</p>

          <!-- ファイルinputは常時DOMに存在させる -->
          <input type="file" name="image" accept="image/*"
            bind:this={fileInput} on:change={handleImage} class="sr-only" />

          {#if imagePreview}
            <div class="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
              <img src={imagePreview} alt="プレビュー" class="w-full h-full object-cover" />
              <button type="button" on:click={removeImage}
                class="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm
                       flex items-center justify-center hover:bg-black/60 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none"
                  viewBox="0 0 24 24" stroke="white" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          {:else}
            <button type="button" on:click={() => fileInput.click()}
              class="w-full aspect-video rounded-xl border-2 border-dashed border-gray-200
                     flex flex-col items-center justify-center gap-2
                     hover:border-gray-300 hover:bg-gray-50/50 transition-colors">
              <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none"
                  viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" class="text-gray-400">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M13.5 12h.008v.008H13.5V12zm0 0a3 3 0 116 0 3 3 0 01-6 0z"/>
                  </svg>
                </div>
                <p class="text-[12px] font-medium text-gray-500">タップして画像を選択</p>
                <p class="text-[10px] text-gray-400">JPEG・PNG・WebP（最大500KB）</p>
              </div>
            </button>
          {/if}
          {#if form?.errors?.image}
            <p class="mt-2 text-[12px] text-red-500">{form.errors.image}</p>
          {/if}
        </div>
      </div>

      <!-- ── 金額・人数 ── -->
      <div class="bg-white rounded-2xl divide-y divide-gray-100 overflow-hidden">

        <div class="px-5 py-4">
          <label for="totalCost" class="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            総額（円）
          </label>
          <div class="flex items-baseline gap-2">
            <span class="text-[15px] text-gray-400">¥</span>
            <input id="totalCost" name="totalCost" type="number"
              bind:value={values.totalCost}
              min="1" step="1"
              class="flex-1 text-[15px] text-gray-900 bg-transparent border-none outline-none"
              required />
          </div>
          {#if form?.errors?.totalCost}
            <p class="mt-1.5 text-[12px] text-red-500">{form.errors.totalCost}</p>
          {/if}
        </div>

        <div class="px-5 py-4">
          <label for="minCount" class="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            最低人数
          </label>
          <div class="flex items-center gap-4">
            <input id="minCount" name="minCount" type="range"
              bind:value={values.minCount}
              min="2" max="20" step="1"
              class="flex-1 accent-gray-900" />
            <span class="w-20 text-right text-[15px] font-semibold text-gray-900 tabular-nums">
              {values.minCount}人以上
            </span>
          </div>
          {#if form?.errors?.minCount}
            <p class="mt-1.5 text-[12px] text-red-500">{form.errors.minCount}</p>
          {/if}
        </div>

        {#if perPerson !== null}
          <div class="px-5 py-3.5 flex items-center justify-between bg-gray-50">
            <p class="text-[12px] text-gray-500">最低人数達成時の1人あたり</p>
            <p class="text-[16px] font-bold text-gray-900">{formatYen(perPerson)}</p>
          </div>
        {/if}
      </div>

      <!-- ── 締め切り ── -->
      <div class="bg-white rounded-2xl overflow-hidden">
        <div class="px-5 py-4">
          <label for="deadline" class="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            締め切り日時
          </label>
          <input id="deadline" name="deadline" type="datetime-local"
            bind:value={values.deadline}
            min={minDate}
            class="w-full text-[14px] text-gray-900 bg-transparent border-none outline-none"
            required />
          {#if form?.errors?.deadline}
            <p class="mt-1.5 text-[12px] text-red-500">{form.errors.deadline}</p>
          {/if}
        </div>
      </div>

      {#if form?.message}
        <p class="text-[13px] text-red-500 text-center">{form.message}</p>
      {/if}

      <button type="submit" disabled={isSubmitting}
        class="w-full py-4 rounded-2xl bg-gray-900 text-white text-[15px] font-semibold
               tracking-tight hover:bg-gray-700 active:scale-[0.98]
               transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
        {isSubmitting ? '保存中…' : '変更を保存する'}
      </button>
    </form>
  </main>
</div>
