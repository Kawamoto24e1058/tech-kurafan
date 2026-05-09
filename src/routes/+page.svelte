<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import type { ItemView, ItemStatus } from '$lib/types';

  export let data: PageData;

  $: openItems   = data.openItems;
  $: activeItems = data.activeItems;
  $: closedItems = data.closedItems;

  function formatYen(n: number) {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n);
  }
  function daysLeft(d: Date) {
    return Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000));
  }

  const STATUS_LABEL: Record<ItemStatus, string> = {
    open: '募集中', funded: '成立', ordered: '発注済み', failed: '終了',
  };
  const STATUS_STYLE: Record<ItemStatus, string> = {
    open:    'bg-blue-50 text-blue-600',
    funded:  'bg-green-50 text-green-600',
    ordered: 'bg-purple-50 text-purple-600',
    failed:  'bg-gray-100 text-gray-400',
  };

  // シグナルバーの色（レベル別）
  const HEAT_COLOR = ['#d1d5db', '#60a5fa', '#f59e0b', '#ef4444', '#22c55e'] as const;

  // ── プッシュ通知 ──────────────────────────────────────────────────
  let notifState: 'unknown' | 'granted' | 'denied' | 'registering' = 'unknown';

  onMount(async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    notifState = Notification.permission as typeof notifState;
    if (notifState === 'granted') {
      const { setupForegroundNotifications } = await import('$lib/firebase.client');
      setupForegroundNotifications();
    }
  });

  async function enableNotifications() {
    notifState = 'registering';
    const { registerPushNotifications, setupForegroundNotifications } =
      await import('$lib/firebase.client');
    const ok = await registerPushNotifications();
    notifState = ok ? 'granted' : 'denied';
    if (ok) setupForegroundNotifications();
  }
</script>

<svelte:head>
  <title>テック部クラファン</title>
</svelte:head>

<div class="min-h-screen bg-[#f5f5f7]">

  <header class="bg-white/90 backdrop-blur-xl border-b border-black/[0.06] sticky top-0 z-20">
    <div class="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h1 class="text-[15px] font-semibold text-gray-900 tracking-tight">テック部クラファン</h1>
        {#if data.currentUserName}
          <span class="text-[11px] text-gray-400 hidden sm:inline">· {data.currentUserName}</span>
        {/if}
      </div>
      <div class="flex items-center gap-4">
        <a href="/items/new"
          class="inline-flex items-center gap-1.5 text-[13px] font-medium text-blue-600 hover:text-blue-500 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          提案する
        </a>
        <!-- プロフィールアイコン -->
        <a href="/profile" class="text-gray-400 hover:text-gray-600 transition-colors" aria-label="プロフィール">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
          </svg>
        </a>
      </div>
    </div>
  </header>

  <!-- 通知許可バナー -->
  {#if notifState === 'unknown'}
    <div class="bg-blue-50 border-b border-blue-100">
      <div class="max-w-2xl mx-auto px-5 py-2.5 flex items-center justify-between gap-4">
        <p class="text-[12px] text-blue-700">
          🔔 新しい提案や達成通知を受け取りますか？
        </p>
        <button
          on:click={enableNotifications}
          class="shrink-0 text-[12px] font-medium text-white bg-blue-500 hover:bg-blue-600
                 px-3 py-1 rounded-lg transition-colors">
          通知をオンにする
        </button>
      </div>
    </div>
  {:else if notifState === 'registering'}
    <div class="bg-blue-50 border-b border-blue-100">
      <div class="max-w-2xl mx-auto px-5 py-2.5">
        <p class="text-[12px] text-blue-600">通知を設定中…</p>
      </div>
    </div>
  {/if}

  <main class="max-w-2xl mx-auto px-5 py-8 space-y-10">

    <!-- ── 募集中 ── -->
    <section>
      <h2 class="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4">
        募集中 · {openItems.length}件
      </h2>

      {#if openItems.length === 0}
        <div class="bg-white rounded-2xl p-8 text-center">
          <p class="text-[13px] text-gray-400">現在募集中のアイテムはありません</p>
          <a href="/items/new"
            class="mt-3 inline-block text-[13px] font-medium text-blue-600 hover:text-blue-500">
            最初の提案をする →
          </a>
        </div>
      {:else}
        <div class="space-y-3">
          {#each openItems as item}
            <a href="/items/{item.id}"
              class="block bg-white rounded-2xl overflow-hidden
                     hover:shadow-md active:scale-[0.99]
                     transition-all duration-200 ease-out">
              <div class="flex">
                <!-- サムネイル -->
                {#if item.imageURL}
                  <div class="w-24 shrink-0 bg-gray-100">
                    <img src={item.imageURL} alt={item.title}
                      class="w-full h-full object-cover" />
                  </div>
                {:else}
                  <div class="w-24 shrink-0 bg-gray-50 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.2"
                      class="text-gray-300">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                    </svg>
                  </div>
                {/if}

                <!-- テキスト -->
                <div class="flex-1 px-4 py-3.5 min-w-0">
                  <div class="flex items-start justify-between gap-2 mb-1">
                    <p class="text-[14px] font-semibold text-gray-900 leading-snug line-clamp-1">
                      {item.title}
                    </p>
                    <span class="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full {STATUS_STYLE[item.status]}">
                      {STATUS_LABEL[item.status]}
                    </span>
                  </div>
                  <p class="text-[12px] text-gray-400 line-clamp-1 mb-3">{item.description}</p>

                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-[13px] font-semibold text-gray-900">{formatYen(item.totalCost)}</p>
                      <p class="text-[10px] text-gray-400">最低{item.targetCount}人で割り勘</p>
                    </div>

                    <!-- シグナルバー + 残り日数 -->
                    <div class="flex items-center gap-2.5">
                      <!-- 3本の縦棒（WiFiシグナル風） -->
                      <div class="flex items-end gap-[3px]">
                        {#each [1, 2, 3] as bar}
                          <div class="w-[5px] rounded-[2px] transition-colors duration-300"
                            style="height:{bar * 5}px; background:{bar <= item.heatLevel ? HEAT_COLOR[item.heatLevel] : '#e5e7eb'}"/>
                        {/each}
                      </div>
                      <span class="text-[10px] text-gray-400">残り{daysLeft(item.deadline)}日</span>
                    </div>
                  </div>
                </div>
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </section>

    <!-- ── 成立・発注済み ── -->
    {#if activeItems.length > 0}
      <section>
        <h2 class="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4">
          成立済み · {activeItems.length}件
        </h2>
        <div class="space-y-3">
          {#each activeItems as item}
            <a href="/items/{item.id}"
              class="flex items-center gap-4 bg-white rounded-2xl px-4 py-3.5
                     hover:shadow-md active:scale-[0.99] transition-all duration-200">
              <div class="flex-1 min-w-0">
                <p class="text-[14px] font-semibold text-gray-900 truncate">{item.title}</p>
                <p class="text-[12px] text-gray-400 mt-0.5">
                  {#if item.amountPerPerson}
                    1人 {formatYen(item.amountPerPerson)}（{item.targetCount}人以上）
                  {:else}
                    {formatYen(item.totalCost)} · 最低{item.targetCount}人
                  {/if}
                </p>
              </div>
              <span class="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full {STATUS_STYLE[item.status]}">
                {STATUS_LABEL[item.status]}
              </span>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    <!-- ── 終了 ── -->
    {#if closedItems.length > 0}
      <section>
        <h2 class="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4">終了済み</h2>
        <div class="space-y-2">
          {#each closedItems as item}
            <a href="/items/{item.id}"
              class="flex items-center gap-3 bg-white/60 rounded-xl px-4 py-3
                     hover:bg-white transition-colors duration-150">
              <p class="flex-1 text-[13px] text-gray-400 truncate">{item.title}</p>
              <p class="shrink-0 text-[12px] text-gray-400">{formatYen(item.totalCost)}</p>
            </a>
          {/each}
        </div>
      </section>
    {/if}

  </main>
</div>
