<script lang="ts">
  // Brand mark. Decorative by design: every place it appears is paired with
  // the "Panggora" wordmark, so the alt text would only repeat it.
  let {
    size = 36,
    class: className = '',
  }: {
    /** Rendered edge length in px. The 192px asset stays sharp up to 64px. */
    size?: number;
    class?: string;
  } = $props();

  const classes = $derived(`shrink-0 select-none${className ? ` ${className}` : ''}`);
</script>

<img
  src="/logo.webp"
  alt=""
  width={size}
  height={size}
  decoding="async"
  draggable="false"
  class={classes}
  style:width="{size}px"
  style:height="{size}px"
/>
