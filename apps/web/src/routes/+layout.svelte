<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import Toast from '#lib/components/Toast.svelte';

  let { children } = $props();

  onMount(() => {
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  });
</script>

{@render children()}
<Toast />
