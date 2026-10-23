<script lang="ts">
  import { ShieldX } from 'lucide-svelte';
</script>

<svelte:head><title>Akses ditolak · Ken Ngekost</title></svelte:head>

<div class="flex min-h-dvh items-center justify-center px-5">
  <div class="app-card max-w-md p-8 text-center">
    <span
      class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-danger-soft text-danger"
    >
      <ShieldX size={26} />
    </span>
    <h1 class="mt-4 text-2xl font-bold">Akses ditolak</h1>
    <p class="mt-2 text-sm text-muted">
      Akun Anda tidak memiliki akses ke organisasi atau halaman ini. Hubungi owner jika perlu akses
      tambahan.
    </p>
    <div class="mt-6 flex justify-center gap-2">
      <a class="btn-secondary" href="/login">Kembali ke login</a>
    </div>
  </div>
</div>
