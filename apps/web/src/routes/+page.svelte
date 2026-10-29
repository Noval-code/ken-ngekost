<script lang="ts">
  import { DoorOpen, FileText, ReceiptText, ShieldCheck, Wallet, Users } from 'lucide-svelte';
</script>

<svelte:head>
  <title>Panggora — Manajemen kost yang tenang</title>
  <meta name="description" content="Panggora membantu owner kost mengelola kamar, penghuni, tagihan, pembayaran, dan laporan kas dari satu tempat." />
</svelte:head>

<div class="min-h-dvh">
  <!-- Header -->
  <header class="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-md">
    <div class="mx-auto flex h-14 max-w-[1180px] items-center justify-between px-4 sm:px-6">
      <a href="/" class="flex items-center gap-2">
        <span class="flex size-9 items-center justify-center rounded-xl bg-accent text-sm font-black text-white">P</span>
        <span class="text-sm font-bold">Panggora</span>
      </a>
      <a href="/login" class="btn-primary btn-sm">Masuk</a>
    </div>
  </header>

  <!-- Hero -->
  <section class="mx-auto max-w-[1180px] px-4 py-12 sm:px-6 sm:py-20">
    <div class="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div>
        <span class="badge-green">Manajemen kost</span>
        <h1 class="mt-4 text-3xl font-bold leading-tight sm:text-5xl">
          Urus kost dengan tenang, dari kamar sampai pembayaran.
        </h1>
        <p class="mt-4 max-w-xl text-base leading-7 text-muted">
          Panggora menyatukan properti, kamar, penghuni, kontrak, tagihan bulanan, pembayaran, deposit, pengeluaran,
          dan laporan kas dalam satu tempat yang mudah dipakai dari HP.
        </p>
        <div class="mt-6 flex flex-wrap gap-3">
          <a href="/login" class="btn-primary">Masuk ke akun</a>
          <a href="#fitur" class="btn-secondary">Lihat fitur</a>
        </div>
        <p class="mt-4 text-xs text-muted">Akun staf dibuat oleh owner melalui halaman Pengaturan.</p>
      </div>

      <div class="app-card p-5 sm:p-6">
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-xl border border-line bg-paper/60 p-4">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-muted">Kamar terisi</p>
            <p class="mt-1 text-2xl font-bold tabular-nums text-accent">87%</p>
            <p class="mt-1 text-xs text-muted">Tingkat hunian properti</p>
          </div>
          <div class="rounded-xl border border-line bg-paper/60 p-4">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-muted">Tagihan bulan ini</p>
            <p class="mt-1 text-2xl font-bold tabular-nums">Rp 12,4 jt</p>
            <p class="mt-1 text-xs text-muted">Otomatis per periode</p>
          </div>
          <div class="rounded-xl border border-line bg-paper/60 p-4">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-muted">Pembayaran</p>
            <p class="mt-1 text-2xl font-bold tabular-nums text-accent">Rp 9,8 jt</p>
            <p class="mt-1 text-xs text-muted">Tercatat rapi</p>
          </div>
          <div class="rounded-xl border border-line bg-paper/60 p-4">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-muted">Laporan kas</p>
            <p class="mt-1 text-2xl font-bold tabular-nums">Real-time</p>
            <p class="mt-1 text-xs text-muted">Pemasukan & pengeluaran</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Fitur -->
  <section id="fitur" class="mx-auto max-w-[1180px] px-4 py-12 sm:px-6">
    <div class="max-w-2xl">
      <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">Fitur</p>
      <h2 class="mt-2 text-2xl font-bold sm:text-3xl">Semua yang Anda butuhkan untuk mengelola kost.</h2>
      <p class="mt-2 text-sm text-muted">
        Dirancang untuk owner dan staf, mobile-first, dan mudah dipakai sehari-hari.
      </p>
    </div>

    <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div class="app-card p-5">
        <span class="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><DoorOpen size={19} /></span>
        <h3 class="mt-3 text-base font-bold">Kamar & properti</h3>
        <p class="mt-1 text-sm text-muted">Kelola beberapa properti, kamar, status operasional, dan tingkat hunian.</p>
      </div>
      <div class="app-card p-5">
        <span class="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><Users size={19} /></span>
        <h3 class="mt-3 text-base font-bold">Penghuni & kontrak</h3>
        <p class="mt-1 text-sm text-muted">Data penghuni, kontrak sewa, harga, dan riwayat kontrak per kamar.</p>
      </div>
      <div class="app-card p-5">
        <span class="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><ReceiptText size={19} /></span>
        <h3 class="mt-3 text-base font-bold">Tagihan otomatis</h3>
        <p class="mt-1 text-sm text-muted">Generate tagihan bulanan per periode, dengan status lunas/belum.</p>
      </div>
      <div class="app-card p-5">
        <span class="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><Wallet size={19} /></span>
        <h3 class="mt-3 text-base font-bold">Pembayaran & deposit</h3>
        <p class="mt-1 text-sm text-muted">Catat pembayaran, kelola deposit masuk/keluar, dan idempotensi.</p>
      </div>
      <div class="app-card p-5">
        <span class="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><FileText size={19} /></span>
        <h3 class="mt-3 text-base font-bold">Pengeluaran & laporan</h3>
        <p class="mt-1 text-sm text-muted">Catat pengeluaran operasional dan lihat laporan kas real-time.</p>
      </div>
      <div class="app-card p-5">
        <span class="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><ShieldCheck size={19} /></span>
        <h3 class="mt-3 text-base font-bold">Aman & terkontrol</h3>
        <p class="mt-1 text-sm text-muted">RBAC owner/admin/manager, audit log, dan akses berbasis properti.</p>
      </div>
    </div>
  </section>

  <!-- Cara kerja -->
  <section class="mx-auto max-w-[1180px] px-4 py-12 sm:px-6">
    <div class="max-w-2xl">
      <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">Cara kerja</p>
      <h2 class="mt-2 text-2xl font-bold sm:text-3xl">Mulai dalam tiga langkah.</h2>
    </div>
    <div class="mt-8 grid gap-4 sm:grid-cols-3">
      <div class="app-card p-5">
        <span class="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">1</span>
        <h3 class="mt-3 text-base font-bold">Tambah properti & kamar</h3>
        <p class="mt-1 text-sm text-muted">Daftarkan lokasi kost dan kamar-kamarnya.</p>
      </div>
      <div class="app-card p-5">
        <span class="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">2</span>
        <h3 class="mt-3 text-base font-bold">Masukkan penghuni & kontrak</h3>
        <p class="mt-1 text-sm text-muted">Buat kontrak sewa dengan harga dan periode.</p>
      </div>
      <div class="app-card p-5">
        <span class="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">3</span>
        <h3 class="mt-3 text-base font-bold">Kelola tagihan & kas</h3>
        <p class="mt-1 text-sm text-muted">Generate tagihan, catat pembayaran, lihat laporan.</p>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="mx-auto max-w-[1180px] px-4 py-12 sm:px-6">
    <div class="app-card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
      <div>
        <h2 class="text-xl font-bold sm:text-2xl">Siap mengelola kost dengan lebih tenang?</h2>
        <p class="mt-1 text-sm text-muted">Masuk ke akun Anda dan mulai hari ini.</p>
      </div>
      <a href="/login" class="btn-primary">Masuk</a>
    </div>
  </section>

  <!-- Footer -->
  <footer class="border-t border-line">
    <div class="mx-auto flex max-w-[1180px] flex-col items-start gap-2 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p>© {new Date().getFullYear()} Panggora. Manajemen kost.</p>
      <p>Dibuat untuk owner & staf kost.</p>
    </div>
  </footer>
</div>
