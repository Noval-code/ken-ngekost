<script lang="ts">
  import { onMount } from 'svelte';
  import { DoorOpen, FileText, ReceiptText, ShieldCheck, Users, Wallet } from 'lucide-svelte';

  // Subtle fade-in on scroll for sections.
  onMount(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const targets = document.querySelectorAll('[data-reveal]');
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  });
</script>

<svelte:head>
  <title>Panggora — Manajemen kost yang tenang</title>
  <meta
    name="description"
    content="Panggora membantu owner kost mengelola kamar, penghuni, tagihan, pembayaran, deposit, pengeluaran, dan laporan kas dari satu tempat."
  />
</svelte:head>

<!-- Hero: full-bleed image -->
<section class="relative isolate overflow-hidden">
  <img
    src="/hero.svg"
    alt=""
    aria-hidden="true"
    class="absolute inset-0 -z-20 h-full w-full object-cover"
    loading="eager"
    decoding="async"
  />
  <!-- Overlay gradient for readability -->
  <div class="absolute inset-0 -z-10 bg-gradient-to-b from-paper/30 via-paper/60 to-paper"></div>
  <!-- Decorative accent blob -->
  <div
    class="pointer-events-none absolute -top-24 -right-24 -z-10 size-72 rounded-full bg-accent/20 blur-3xl"
    aria-hidden="true"
  ></div>
  <div
    class="pointer-events-none absolute bottom-0 left-0 -z-10 size-64 rounded-full bg-amber-soft/60 blur-3xl"
    aria-hidden="true"
  ></div>

  <div class="mx-auto max-w-[1280px] px-4 pb-24 pt-12 sm:px-6 sm:pt-20 sm:pb-32">
    <div class="mx-auto max-w-3xl text-center" data-reveal>
      <span class="badge-green">Manajemen kost</span>
      <h1 class="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
        Urus kost dengan tenang,<br class="hidden sm:block" />
        <span class="text-accent">dari kamar sampai pembayaran.</span>
      </h1>
      <p class="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
        Panggora menyatukan properti, kamar, penghuni, kontrak, tagihan bulanan, pembayaran, deposit,
        pengeluaran, dan laporan kas dalam satu tempat yang mudah dipakai dari HP.
      </p>
      <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
        <a href="/login" class="btn-primary px-6">Masuk ke akun</a>
        <a href="#fitur" class="btn-secondary px-6">Lihat fitur</a>
      </div>
      <p class="mt-4 text-xs text-muted">Akun staf dibuat oleh owner melalui halaman Pengaturan.</p>
    </div>

    <!-- Floating mockup card overlapping into next section -->
    <div class="relative mx-auto mt-10 max-w-4xl" data-reveal>
      <div
        class="app-card mx-auto overflow-hidden p-4 sm:p-6 shadow-[0_24px_60px_-24px_rgb(24_35_31/0.35)]"
      >
        <div class="flex items-center justify-between border-b border-line pb-3">
          <div class="flex items-center gap-2">
            <span class="flex size-8 items-center justify-center rounded-lg bg-accent text-xs font-black text-white">P</span>
            <span class="text-sm font-bold">Dashboard Panggora</span>
          </div>
          <span class="badge-green">Live</span>
        </div>
        <div class="mt-4 grid gap-3 sm:grid-cols-3">
          <div class="rounded-xl border border-line bg-paper/60 p-3">
            <p class="text-[10px] font-semibold uppercase tracking-wider text-muted">Kamar terisi</p>
            <p class="mt-0.5 text-xl font-bold tabular-nums text-accent">87%</p>
            <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
              <div class="h-full rounded-full bg-accent" style="width: 87%"></div>
            </div>
          </div>
          <div class="rounded-xl border border-line bg-paper/60 p-3">
            <p class="text-[10px] font-semibold uppercase tracking-wider text-muted">Tagihan bulan ini</p>
            <p class="mt-0.5 text-xl font-bold tabular-nums">Rp 12,4 jt</p>
            <p class="mt-1 text-[11px] text-muted">14 tagihan aktif</p>
          </div>
          <div class="rounded-xl border border-line bg-paper/60 p-3">
            <p class="text-[10px] font-semibold uppercase tracking-wider text-muted">Pembayaran</p>
            <p class="mt-0.5 text-xl font-bold tabular-nums text-accent">Rp 9,8 jt</p>
            <p class="mt-1 text-[11px] text-muted">3 belum lunas</p>
          </div>
        </div>
        <div class="mt-4 grid gap-2 sm:grid-cols-2">
          <div class="rounded-xl border border-line bg-surface p-3">
            <p class="text-[11px] font-semibold text-muted">Kamar A-01 · Kost Melati</p>
            <p class="mt-1 text-sm font-bold">Budi Santoso</p>
            <p class="text-xs text-muted">Lunas · Rp 1.500.000</p>
          </div>
          <div class="rounded-xl border border-line bg-surface p-3">
            <p class="text-[11px] font-semibold text-muted">Kamar B-03 · Kost Melati</p>
            <p class="mt-1 text-sm font-bold">Siti Aminah</p>
            <p class="text-xs text-amber">Belum lunas · Rp 1.600.000</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Stats -->
  <section class="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
    <div class="grid gap-4 sm:grid-cols-4" data-reveal>
      <div class="app-card p-5 text-center">
        <p class="text-3xl font-bold tabular-nums text-accent">100%</p>
        <p class="mt-1 text-xs text-muted">Basis web, akses dari HP</p>
      </div>
      <div class="app-card p-5 text-center">
        <p class="text-3xl font-bold tabular-nums">6+</p>
        <p class="mt-1 text-xs text-muted">Modul terintegrasi</p>
      </div>
      <div class="app-card p-5 text-center">
        <p class="text-3xl font-bold tabular-nums">24/7</p>
        <p class="mt-1 text-xs text-muted">Akses kapan saja</p>
      </div>
      <div class="app-card p-5 text-center">
        <p class="text-3xl font-bold tabular-nums text-accent">Aman</p>
        <p class="mt-1 text-xs text-muted">RBAC & audit log</p>
      </div>
    </div>
  </section>

  <!-- Fitur bento -->
  <section id="fitur" class="mx-auto max-w-[1280px] px-4 py-12 sm:px-6">
    <div class="max-w-2xl" data-reveal>
      <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">Fitur</p>
      <h2 class="mt-2 text-2xl font-bold sm:text-3xl">Semua yang Anda butuhkan untuk mengelola kost.</h2>
      <p class="mt-2 text-sm text-muted">
        Dirancang untuk owner dan staf, mobile-first, dan mudah dipakai sehari-hari.
      </p>
    </div>

    <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-reveal>
      <div class="app-card group p-5 transition-transform hover:-translate-y-1">
        <span class="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent-soft to-accent/20 text-accent">
          <DoorOpen size={20} />
        </span>
        <h3 class="mt-4 text-base font-bold">Kamar & properti</h3>
        <p class="mt-1 text-sm text-muted">Kelola beberapa properti, kamar, status operasional, dan tingkat hunian.</p>
      </div>
      <div class="app-card group p-5 transition-transform hover:-translate-y-1">
        <span class="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent-soft to-accent/20 text-accent">
          <Users size={20} />
        </span>
        <h3 class="mt-4 text-base font-bold">Penghuni & kontrak</h3>
        <p class="mt-1 text-sm text-muted">Data penghuni, kontrak sewa, harga, dan riwayat kontrak per kamar.</p>
      </div>
      <div class="app-card group p-5 transition-transform hover:-translate-y-1">
        <span class="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent-soft to-accent/20 text-accent">
          <ReceiptText size={20} />
        </span>
        <h3 class="mt-4 text-base font-bold">Tagihan otomatis</h3>
        <p class="mt-1 text-sm text-muted">Generate tagihan bulanan per periode, dengan status lunas/belum.</p>
      </div>
      <div class="app-card group p-5 transition-transform hover:-translate-y-1">
        <span class="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent-soft to-accent/20 text-accent">
          <Wallet size={20} />
        </span>
        <h3 class="mt-4 text-base font-bold">Pembayaran & deposit</h3>
        <p class="mt-1 text-sm text-muted">Catat pembayaran, kelola deposit masuk/keluar, dengan idempotensi.</p>
      </div>
      <div class="app-card group p-5 transition-transform hover:-translate-y-1">
        <span class="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent-soft to-accent/20 text-accent">
          <FileText size={20} />
        </span>
        <h3 class="mt-4 text-base font-bold">Pengeluaran & laporan</h3>
        <p class="mt-1 text-sm text-muted">Catat pengeluaran operasional dan lihat laporan kas real-time.</p>
      </div>
      <div class="app-card group p-5 transition-transform hover:-translate-y-1">
        <span class="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent-soft to-accent/20 text-accent">
          <ShieldCheck size={20} />
        </span>
        <h3 class="mt-4 text-base font-bold">Aman & terkontrol</h3>
        <p class="mt-1 text-sm text-muted">RBAC owner/admin/manager, audit log, dan akses berbasis properti.</p>
      </div>
    </div>
  </section>

  <!-- Cara kerja -->
  <section class="mx-auto max-w-[1280px] px-4 py-12 sm:px-6">
    <div class="max-w-2xl" data-reveal>
      <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">Cara kerja</p>
      <h2 class="mt-2 text-2xl font-bold sm:text-3xl">Mulai dalam tiga langkah.</h2>
    </div>
    <div class="relative mt-10 grid gap-6 sm:grid-cols-3" data-reveal>
      <div class="hidden sm:block absolute top-6 left-[16%] right-[16%] h-px bg-gradient-to-r from-accent/20 via-accent to-accent/20" aria-hidden="true"></div>
      <div class="relative app-card p-5">
        <span class="relative z-10 flex size-11 items-center justify-center rounded-full bg-accent text-sm font-bold text-white ring-4 ring-paper">1</span>
        <h3 class="mt-4 text-base font-bold">Tambah properti & kamar</h3>
        <p class="mt-1 text-sm text-muted">Daftarkan lokasi kost dan kamar-kamarnya.</p>
      </div>
      <div class="relative app-card p-5">
        <span class="relative z-10 flex size-11 items-center justify-center rounded-full bg-accent text-sm font-bold text-white ring-4 ring-paper">2</span>
        <h3 class="mt-4 text-base font-bold">Masukkan penghuni & kontrak</h3>
        <p class="mt-1 text-sm text-muted">Buat kontrak sewa dengan harga dan periode.</p>
      </div>
      <div class="relative app-card p-5">
        <span class="relative z-10 flex size-11 items-center justify-center rounded-full bg-accent text-sm font-bold text-white ring-4 ring-paper">3</span>
        <h3 class="mt-4 text-base font-bold">Kelola tagihan & kas</h3>
        <p class="mt-1 text-sm text-muted">Generate tagihan, catat pembayaran, lihat laporan.</p>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="mx-auto max-w-[1280px] px-4 py-12 sm:px-6">
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent to-accent-dark p-6 text-white shadow-[var(--shadow-card)] sm:p-10" data-reveal>
      <div class="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/10 blur-3xl" aria-hidden="true"></div>
      <div class="pointer-events-none absolute -bottom-20 -left-10 size-72 rounded-full bg-amber-soft/20 blur-3xl" aria-hidden="true"></div>
      <div class="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-xl font-bold sm:text-2xl">Siap mengelola kost dengan lebih tenang?</h2>
          <p class="mt-1 text-sm text-white/80">Masuk ke akun Anda dan mulai hari ini.</p>
        </div>
        <a href="/login" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-accent transition-colors hover:bg-paper">
          Masuk
        </a>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="border-t border-line">
    <div class="mx-auto flex max-w-[1280px] flex-col items-start gap-2 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p>© {new Date().getFullYear()} Panggora. Manajemen kost.</p>
      <p>Dibuat untuk owner & staf kost.</p>
    </div>
  </footer>

  <style>
    [data-reveal] {
      opacity: 0;
      transform: translateY(16px);
      transition: opacity 0.6s ease, transform 0.6s ease;
    }
    [data-reveal].is-visible {
      opacity: 1;
      transform: none;
    }
    @media (prefers-reduced-motion: reduce) {
      [data-reveal] {
        opacity: 1;
        transform: none;
        transition: none;
      }
    }
  </style>
