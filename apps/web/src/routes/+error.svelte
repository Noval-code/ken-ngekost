<script lang="ts">
  import { page } from '$app/state';
  import { ArrowLeft, SearchX } from 'lucide-svelte';
</script>

<svelte:head><title>{page.status} · Ken Ngekost</title></svelte:head>

<div class="flex min-h-dvh items-center justify-center px-5 py-10">
  <div class="app-card w-full max-w-md p-8 text-center">
    <span
      class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-soft text-amber"
    >
      <SearchX size={26} />
    </span>
    <p class="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-muted">Error {page.status}</p>
    <h1 class="mt-1 text-2xl font-bold">
      {page.status === 404 ? 'Halaman tidak ditemukan' : 'Terjadi kesalahan'}
    </h1>
    <p class="mt-2 text-sm text-muted">
      {page.error?.message ?? 'Halaman yang Anda cari tidak tersedia atau sedang bermasalah.'}
    </p>
    <a class="btn-primary mt-6" href="/"><ArrowLeft size={17} /> Kembali ke beranda</a>
  </div>
</div>
