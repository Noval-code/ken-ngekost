<script lang="ts">
  import { statusClass, statusLabel } from '#lib/format.js';

  let { status, label }: { status: string; label?: string } = $props();
</script>

<span class={statusClass(status)}>{label ?? statusLabel(status)}</span>
