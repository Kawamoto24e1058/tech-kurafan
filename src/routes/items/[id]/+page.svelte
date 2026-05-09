<script lang="ts">
  import { enhance } from '$app/forms';
  import HeatIndicator from '$lib/components/HeatIndicator.svelte';
  import type { PageData, ActionData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  $: item        = data.item;
  $: commitments = data.commitments;
  $: currentUserId = data.currentUserId;
  $: isAdmin     = data.isAdmin;

  $: isCreator   = item.creatorId === currentUserId;
  $: isCommitted = !!item.myCommitment;
  $: isPaid      = item.myCommitment?.status === 'paid';
  $: paidCount   = commitments.filter(c => c.status === 'paid').length;
  $: allPaid     = commitments.length > 0 && paidCount === commitments.length;
  $: canManage   = isCreator || isAdmin;

  $: deadlineDate = new Date(item.deadline);
  $: daysLeft = Math.max(0, Math.ceil((deadlineDate.getTime() - Date.now()) / 86400000));

  function formatYen(n: number) {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n);
  }
  function formatDate(d: Date | undefined) {
    if (!d) return '';
    return new Intl.DateTimeFormat('ja-JP', {
      month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(new Date(d));
  }

  let isSubmitting = false;
  let showDeleteConfirm = false;

  const STATUS_LABEL  = { open: '募集中', funded: '成立', ordered: '発注済み', failed: '終了' };
  const STATUS_STYLE  = {
    open:    'bg-blue-50 text-blue-600',
    funded:  'bg-green-50 text-green-600',
    ordered: 'bg-purple-50 text-purple-600',
    failed:  'bg-gray-100 text-gray-400',
  };
</script>

<svelte:head>
  <title>{item.title} — テック部クラファン</title>
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
      <span class="flex-1 text-[15px] font-semibold text-gray-900 truncate tracking-tight">
        {item.title}
      </span>
      {#if canManage && item.status === 'open'}
        <a href="/items/{item.id}/edit"
          class="shrink-0 text-[13px] font-medium text-blue-600 hover:text-blue-500 transition-colors">
          編集
        </a>
      {/if}
      {#if isAdmin}
        <span class="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">管理者</span>
      {/if}
      <span class="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full {STATUS_STYLE[item.status]}">
        {STATUS_LABEL[item.status]}
      </span>
    </div>
  </header>

  <main class="max-w-2xl mx-auto px-5 py-8 space-y-4">

    <!-- ── アイテムカード ── -->
    <section class="bg-white rounded-2xl overflow-hidden">

      {#if item.imageURL}
        <div class="aspect-[16/9] bg-gray-100">
          <img src={item.imageURL} alt={item.title} class="w-full h-full object-cover"/>
        </div>
      {:else}
        <div class="aspect-[16/9] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" stroke-width="1" class="text-gray-200">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
        </div>
      {/if}

      <div class="px-6 py-5 space-y-4">
        <div>
          <h1 class="text-[22px] font-bold text-gray-900 tracking-tight leading-tight">{item.title}</h1>
          <p class="mt-2 text-[14px] text-gray-500 leading-relaxed">{item.description}</p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="bg-gray-50 rounded-xl px-4 py-3">
            <p class="text-[11px] text-gray-400 mb-1">総額</p>
            <p class="text-[18px] font-bold text-gray-900 tracking-tight">{formatYen(item.totalCost)}</p>
          </div>
          <div class="bg-gray-50 rounded-xl px-4 py-3">
            {#if item.status === 'open'}
              <p class="text-[11px] text-gray-400 mb-1">最低人数</p>
              <p class="text-[18px] font-bold text-gray-900">
                {item.targetCount}<span class="text-[13px] font-normal text-gray-500 ml-1">人以上</span>
              </p>
              <p class="text-[10px] text-gray-400 mt-0.5">目安 {formatYen(Math.ceil(item.totalCost / item.targetCount))}/人</p>
            {:else if item.amountPerPerson != null}
              <p class="text-[11px] text-gray-400 mb-1">1人あたり（確定）</p>
              <p class="text-[18px] font-bold text-green-600 tracking-tight">{formatYen(item.amountPerPerson)}</p>
              <p class="text-[10px] text-gray-400 mt-0.5">{commitments.length}人で割り勘</p>
            {/if}
          </div>
        </div>

        {#if item.status === 'open'}
          <div class="flex items-center gap-2 text-[13px] text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"/>
            </svg>
            <span>
              {formatDate(deadlineDate)}まで
              {#if daysLeft > 0}
                <span class="font-medium text-gray-600">（残り{daysLeft}日）</span>
              {:else}
                <span class="font-medium text-red-500">（本日締め切り）</span>
              {/if}
            </span>
          </div>
        {/if}
      </div>
    </section>

    <!-- ── 熱量インジケーター ── -->
    {#if item.status === 'open' || item.status === 'failed'}
      <section class="bg-white rounded-2xl px-6 py-5">
        <h2 class="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-5">募集の熱量</h2>
        {#if item.status === 'failed'}
          <div class="mb-5 text-center">
            <p class="text-[13px] text-gray-400">締め切りまでに最低人数に達しませんでした</p>
          </div>
        {/if}
        <HeatIndicator heatLevel={item.heatLevel} status={item.status}/>
      </section>
    {/if}

    <!-- ── 賛同エリア（募集中のみ） ── -->
    {#if item.status === 'open'}
      <section class="bg-white rounded-2xl px-6 py-5">
        {#if isCommitted}
          <div class="flex items-center gap-3 py-1">
            <div class="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"
                viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" class="text-green-500">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <div>
              <p class="text-[14px] font-semibold text-gray-800">賛同済み</p>
              <p class="text-[12px] text-gray-400">{formatDate(item.myCommitment?.committedAt)} に参加</p>
            </div>
          </div>
        {:else}
          <div class="mb-4">
            <p class="text-[14px] font-semibold text-gray-800 mb-1">このアイテムを購入しますか？</p>
            <p class="text-[12px] text-gray-400 leading-relaxed">
              最低{item.targetCount}人に達した時点で割り勘が確定します。賛同後のキャンセルはできません。
            </p>
          </div>
          {#if form?.message}
            <p class="mb-3 text-[12px] text-red-500">{form.message}</p>
          {/if}
          <form method="POST" action="?/commit"
            use:enhance={() => {
              isSubmitting = true;
              return async ({ update }) => { await update(); isSubmitting = false; };
            }}>
            <button type="submit" disabled={isSubmitting}
              class="w-full py-3.5 rounded-xl bg-gray-900 text-white text-[14px] font-semibold
                     tracking-tight hover:bg-gray-700 active:scale-[0.98]
                     transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? '処理中…' : '賛同する'}
            </button>
          </form>
        {/if}
      </section>
    {/if}

    <!-- ── 支払い状況（funded / ordered） ── -->
    {#if (item.status === 'funded' || item.status === 'ordered') && commitments.length > 0}
      <section class="bg-white rounded-2xl px-6 py-5 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-[14px] font-bold text-gray-900">支払い状況</h2>
          <span class="text-[12px] text-gray-400">{paidCount}/{commitments.length}人完了</span>
        </div>

        <div class="h-[5px] bg-gray-100 rounded-full overflow-hidden">
          <div class="h-full bg-green-400 rounded-full transition-all duration-700 ease-out"
            style="width: {commitments.length > 0 ? (paidCount / commitments.length) * 100 : 0}%"/>
        </div>

        {#if allPaid}
          <div class="bg-green-50 rounded-xl px-4 py-3 text-center">
            <p class="text-[13px] font-semibold text-green-600">🎉 全員の支払いが完了しました</p>
          </div>
        {:else}
          <div class="bg-amber-50 rounded-xl px-4 py-3">
            <p class="text-[12px] text-amber-700 text-center">全員が支払いを完了するまで発注に進めません</p>
          </div>
        {/if}

        <ul class="space-y-2.5">
          {#each commitments as c}
            <li class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-gray-100 shrink-0 overflow-hidden flex items-center justify-center">
                {#if c.photoURL}
                  <img src={c.photoURL} alt={c.displayName} class="w-full h-full object-cover"/>
                {:else}
                  <span class="text-[13px] font-semibold text-gray-400">{c.displayName.charAt(0)}</span>
                {/if}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[13px] font-medium text-gray-800 truncate">
                  {c.displayName}
                  {#if c.userId === currentUserId}
                    <span class="text-[11px] font-normal text-gray-400 ml-1">（自分）</span>
                  {/if}
                </p>
                {#if c.status === 'paid' && c.paidAt}
                  <p class="text-[11px] text-gray-400">{formatDate(c.paidAt)}</p>
                {/if}
              </div>
              {#if c.status === 'paid'}
                <span class="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold
                  text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                  支払済
                </span>
              {:else}
                <span class="shrink-0 text-[11px] font-semibold text-red-400 bg-red-50 px-2.5 py-1 rounded-full">未払い</span>
              {/if}
            </li>
          {/each}
        </ul>

        {#if isCommitted && !isPaid}
          <form method="POST" action="?/markPaid"
            use:enhance={() => {
              isSubmitting = true;
              return async ({ update }) => { await update(); isSubmitting = false; };
            }}>
            <button type="submit" disabled={isSubmitting}
              class="w-full py-3.5 rounded-xl bg-green-500 text-white text-[14px] font-semibold
                     hover:bg-green-400 active:scale-[0.98]
                     transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? '処理中…' : '支払い完了を報告する'}
            </button>
          </form>
          <p class="text-[11px] text-gray-300 text-center">報告後、担当者に確認してもらってください</p>
        {/if}
      </section>
    {/if}

    <!-- ── 発注ボタン（作成者 or 管理者・funded・全員払い済み） ── -->
    {#if canManage && item.status === 'funded' && allPaid}
      <section class="bg-white rounded-2xl px-6 py-5">
        <p class="text-[13px] text-gray-500 text-center mb-4">
          全員の支払いを確認しました。発注に進むことができます。
        </p>
        <form method="POST" action="?/markOrdered"
          use:enhance={() => {
            isSubmitting = true;
            return async ({ update }) => { await update(); isSubmitting = false; };
          }}>
          <button type="submit" disabled={isSubmitting}
            class="w-full py-3.5 rounded-xl bg-purple-600 text-white text-[14px] font-semibold
                   hover:bg-purple-500 active:scale-[0.98] transition-all duration-150 disabled:opacity-50">
            {isSubmitting ? '処理中…' : '発注済みにする'}
          </button>
        </form>
      </section>
    {/if}

    <!-- ── 管理者エリア ── -->
    {#if isAdmin}
      <section class="bg-amber-50 rounded-2xl px-6 py-5 space-y-3">
        <p class="text-[11px] font-semibold text-amber-600 uppercase tracking-widest">管理者メニュー</p>

        {#if !showDeleteConfirm}
          <button
            on:click={() => showDeleteConfirm = true}
            class="w-full py-3 rounded-xl border border-red-200 text-red-500 text-[13px] font-medium
                   hover:bg-red-50 transition-colors">
            このアイテムを削除する
          </button>
        {:else}
          <div class="bg-white rounded-xl px-4 py-4 space-y-3">
            <p class="text-[13px] text-gray-700 text-center font-medium">本当に削除しますか？<br/>この操作は取り消せません。</p>
            <div class="flex gap-2">
              <button on:click={() => showDeleteConfirm = false}
                class="flex-1 py-2.5 rounded-lg border border-gray-200 text-[13px] text-gray-500 hover:bg-gray-50">
                キャンセル
              </button>
              <form method="POST" action="?/deleteItem" class="flex-1"
                use:enhance={() => {
                  isSubmitting = true;
                  return async ({ update }) => { await update(); isSubmitting = false; };
                }}>
                <button type="submit" disabled={isSubmitting}
                  class="w-full py-2.5 rounded-lg bg-red-500 text-white text-[13px] font-semibold
                         hover:bg-red-400 disabled:opacity-50">
                  {isSubmitting ? '削除中…' : '削除する'}
                </button>
              </form>
            </div>
          </div>
        {/if}
      </section>
    {/if}

  </main>
</div>
