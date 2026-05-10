<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';

  onMount(async () => {
    if ('serviceWorker' in navigator) {
      // sw.js が PWA キャッシュ + FCM バックグラウンド通知を担う
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(console.error);
    }
  });
</script>

<slot />
