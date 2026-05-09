<script lang="ts">
  import type { HeatLevel } from '$lib/types';

  export let heatLevel: HeatLevel = 0;
  export let status: 'open' | 'funded' | 'failed' | 'ordered' = 'open';

  $: displayLevel = (status === 'funded' || status === 'ordered') ? 4 : heatLevel;

  const META: Record<number, {
    color: string; rings: number; duration: number;
  }> = {
    0: { color: '#9ca3af', rings: 0, duration: 0    },
    1: { color: '#60a5fa', rings: 1, duration: 2800  },
    2: { color: '#f59e0b', rings: 2, duration: 1700  },
    3: { color: '#ef4444', rings: 3, duration: 900   },
    4: { color: '#22c55e', rings: 0, duration: 0    },
  };

  $: m    = META[displayLevel];
  $: rings = Array.from({ length: m.rings }, (_, i) => i);
</script>

<div class="flex items-center gap-6">

  <!-- 波紋オーブ -->
  <div class="relative w-14 h-14 flex items-center justify-center shrink-0">
    {#each rings as i}
      <div class="ripple-ring absolute rounded-full"
        style="border:1.5px solid {m.color}; width:100%; height:100%;
               animation-duration:{m.duration}ms;
               animation-delay:{Math.floor(i * (m.duration / m.rings))}ms;"/>
    {/each}

    {#if displayLevel === 4}
      <div class="relative z-10 w-8 h-8 rounded-full flex items-center justify-center"
        style="background:{m.color}">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"
          viewBox="0 0 24 24" stroke="white" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
      </div>
    {:else if status === 'failed'}
      <div class="relative z-10 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none"
          viewBox="0 0 24 24" stroke="#9ca3af" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </div>
    {:else}
      <div class="relative z-10 rounded-full"
        class:orb-pulse={m.rings > 0}
        style="width:{10 + displayLevel * 2}px; height:{10 + displayLevel * 2}px;
               background:{m.color}; animation-duration:{m.duration}ms;"/>
    {/if}
  </div>

  <!-- シグナルバー + 注記 -->
  <div class="space-y-2">
    <!-- 縦棒3本 -->
    <div class="flex items-end gap-1">
      {#each [1, 2, 3] as bar}
        <div class="w-2 rounded-[3px] transition-colors duration-300"
          style="height:{bar * 8}px; background:{bar <= displayLevel ? m.color : '#e5e7eb'}"/>
      {/each}
    </div>
    {#if status === 'open'}
      <p class="text-[11px] text-gray-300">人数は締め切りまで非公開</p>
    {/if}
  </div>

</div>

<style>
  .ripple-ring {
    animation: ripple-out linear infinite;
    opacity: 0;
  }

  @keyframes ripple-out {
    0%   { transform: scale(0.6); opacity: 0.7; }
    100% { transform: scale(2.4); opacity: 0;   }
  }

  .orb-pulse {
    animation: orb-beat ease-in-out infinite;
  }

  @keyframes orb-beat {
    0%, 100% { transform: scale(1);    opacity: 1;    }
    50%       { transform: scale(1.18); opacity: 0.75; }
  }
</style>
