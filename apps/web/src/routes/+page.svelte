<script lang="ts">
  import { onMount } from 'svelte';
  import {
    ArrowDownRight,
    BarChart3,
    Building2,
    CalendarDays,
    ChevronDown,
    CircleDollarSign,
    DoorOpen,
    FileText,
    Landmark,
    LayoutDashboard,
    Mail,
    Menu,
    Plus,
    ReceiptText,
    Settings,
    ShieldCheck,
    Users,
    Wallet,
    X,
  } from 'lucide-svelte';
  import Logo from '#lib/components/Logo.svelte';
  import StatCard from '#lib/components/StatCard.svelte';
  import { formatIdr } from '#lib/format.js';

  let scrolled = $state(false);
  let menuOpen = $state(false);
  let status = $state<'checking' | 'ok' | 'down'>('checking');
  let mockupTilt: HTMLDivElement | undefined;

  // The navbar is transparent over the hero photo and turns solid once the
  // page scrolls (or while the mobile menu is open).
  const solidNav = $derived(scrolled || menuOpen);

  const navLinkClass = $derived(
    solidNav
      ? 'rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-black/5 hover:text-ink'
      : 'rounded-lg px-3 py-2 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white',
  );

  const mobileLinkClass = $derived(
    'block rounded-xl px-3 py-3 text-sm font-semibold transition-colors ' +
      (solidNav ? 'text-ink hover:bg-black/5' : 'text-white hover:bg-white/10'),
  );

  // Sidebar inside the landing preview, mirroring the real app shell.
  const previewNav = [
    { label: 'Beranda', icon: LayoutDashboard, active: true },
    { label: 'Kamar', icon: DoorOpen, active: false },
    { label: 'Tagihan', icon: ReceiptText, active: false },
    { label: 'Pembayaran', icon: Wallet, active: false },
    { label: 'Properti', icon: Building2, active: false },
    { label: 'Penghuni', icon: Users, active: false },
    { label: 'Deposit', icon: Landmark, active: false },
    { label: 'Laporan', icon: BarChart3, active: false },
    { label: 'Pengaturan', icon: Settings, active: false },
  ];

  // Kost businesses shown in the landing marquee.
  const partners = [
    'Ken ngekost',
    'Kost Putra Putri Arul Family',
    "De'kost & homestay tegal",
    'DIVA KOS',
  ];

  const faqs = [
    {
      q: 'Apakah data kost saya aman?',
      a: 'Data setiap organisasi terpisah dan hanya bisa diakses anggota organisasi tersebut. Setiap peran punya batas akses, dan aktivitas penting tercatat di audit log.',
    },
    {
      q: 'Bisa mengelola lebih dari satu properti?',
      a: 'Bisa. Tambahkan properti sebanyak yang Anda kelola, lalu pantau kamar, penghuni, dan tagihan per properti maupun gabungan.',
    },
    {
      q: 'Apakah staf bisa ikut memakai?',
      a: 'Bisa. Owner membuat akun staf dengan peran admin atau manager, dan aksesnya dibatasi sesuai properti yang ditugaskan.',
    },
    {
      q: 'Perlu instal aplikasi dulu?',
      a: 'Tidak perlu. Panggora berjalan di browser, jadi cukup buka dari HP atau laptop. Di HP bisa ditambahkan ke layar utama agar seperti aplikasi.',
    },
    {
      q: 'Bisa dipakai dari HP?',
      a: 'Ya. Tampilan dirancang mobile-first, jadi mencatat pembayaran atau mengecek tunggakan tetap nyaman dari layar kecil.',
    },
    {
      q: 'Bagaimana tagihan bulanan dibuat?',
      a: 'Tagihan dibuat per periode untuk kontrak yang aktif, lengkap dengan status lunas atau belum. Anda tidak perlu menghitung ulang setiap bulan.',
    },
  ];

  // Subtle fade-in on scroll. Content is fully visible by default; the
  // animation is a pure enhancement, so the page never depends on JS.
  onMount(() => {
    // The landing canvas is white, while the app shell keeps its cream tone.
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ffffff');

    const onScroll = () => {
      scrolled = window.scrollY > 12;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let io: IntersectionObserver | undefined;

    if (!reduceMotion && typeof IntersectionObserver !== 'undefined') {
      const targets = document.querySelectorAll('[data-reveal]');
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              e.target.classList.add('is-visible');
              io?.unobserve(e.target);
            }
          }
        },
        { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
      );
      targets.forEach((t) => io?.observe(t));
    }

    // Scroll-linked 3D tilt for the dashboard mockup, mirroring the hero card
    // on atlasindonesia.com: the card leans back as it enters, straightens in
    // the middle of the viewport, then leans the other way as it leaves.
    let tiltFrame = 0;

    const updateTilt = () => {
      tiltFrame = 0;
      if (!mockupTilt) return;

      const rect = mockupTilt.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.bottom < 0 || rect.top > vh) return;

      // 0 = card entering from the bottom, 1 = card leaving past the top.
      const progress = Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)));
      // Soften the effect on phones so the preview text stays easy to read.
      const factor = window.matchMedia('(max-width: 639px)').matches ? 0.7 : 1;
      // 1 at the middle of the viewport, 0 at either edge.
      const proximity = 1 - Math.abs(2 * progress - 1);

      mockupTilt.style.setProperty('--tilt-x', `${(16 - 32 * progress) * factor}deg`);
      mockupTilt.style.setProperty('--tilt-y', `${(-12 + 24 * progress) * factor}deg`);
      mockupTilt.style.setProperty('--tilt-shift', `${(30 - 60 * progress) * factor}px`);
      mockupTilt.style.setProperty('--tilt-scale', `${0.96 + 0.04 * proximity}`);
    };

    const queueTilt = () => {
      if (!tiltFrame) tiltFrame = requestAnimationFrame(updateTilt);
    };

    if (!reduceMotion && mockupTilt) {
      updateTilt();
      window.addEventListener('scroll', queueTilt, { passive: true });
      window.addEventListener('resize', queueTilt);
    }

    fetch('/api/health', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('unhealthy'))))
      .then((d) => {
        status = d?.status === 'ok' ? 'ok' : 'down';
      })
      .catch(() => {
        status = 'down';
      });

    return () => {
      window.removeEventListener('scroll', onScroll);
      io?.disconnect();
      if (tiltFrame) cancelAnimationFrame(tiltFrame);
      window.removeEventListener('scroll', queueTilt);
      window.removeEventListener('resize', queueTilt);
    };
  });

  function closeMenu() {
    menuOpen = false;
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') menuOpen = false;
  }
</script>

<svelte:window onkeydown={onKeydown} />

<svelte:head>
  <title>Panggora — Manajemen kost yang tenang</title>
  <meta
    name="description"
    content="Panggora membantu owner kost mengelola kamar, penghuni, tagihan, pembayaran, deposit, pengeluaran, dan laporan kas dari satu tempat."
  />
  <link rel="preload" as="image" href="/hero.webp" fetchpriority="high" />
</svelte:head>

<a
  href="#konten"
  class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-ink focus:shadow-lg"
>
  Lewati ke konten
</a>

<!-- Navbar -->
<header
  id="top"
  class="fixed inset-x-0 top-0 z-50 transition-colors duration-300 {solidNav
    ? 'border-b border-line bg-white/90 text-ink backdrop-blur-md [--color-focus:var(--color-accent)]'
    : 'bg-gradient-to-b from-black/60 via-black/25 to-transparent text-white [--color-focus:#fff]'}"
>
  <nav
    class="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6"
    aria-label="Navigasi utama"
  >
    <a href="#top" class="flex items-center gap-2 rounded-lg">
      <Logo size={36} />
      <span class="text-lg font-bold tracking-tight">Panggora</span>
    </a>

    <div class="hidden items-center gap-1 md:flex">
      <a href="#fitur" class={navLinkClass}>Fitur</a>
      <a href="#cara-kerja" class={navLinkClass}>Cara kerja</a>
      <a href="#manfaat" class={navLinkClass}>Manfaat</a>
      <a href="#faq" class={navLinkClass}>FAQ</a>
      <a href="/login" class="btn-primary ml-2 px-5">Masuk ke akun</a>
    </div>

    <button
      type="button"
      class="inline-flex size-11 items-center justify-center rounded-xl transition-colors md:hidden {solidNav
        ? 'text-ink hover:bg-black/5'
        : 'text-white hover:bg-white/10'}"
      aria-expanded={menuOpen}
      aria-controls="menu-mobile"
      aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
      onclick={() => (menuOpen = !menuOpen)}
    >
      {#if menuOpen}<X size={22} />{:else}<Menu size={22} />{/if}
    </button>
  </nav>

  {#if menuOpen}
    <div id="menu-mobile" class="border-t border-line bg-white/95 px-4 pb-4 pt-2 backdrop-blur-md md:hidden">
      <div class="flex flex-col gap-1">
        <a href="#fitur" class={mobileLinkClass} onclick={closeMenu}>Fitur</a>
        <a href="#cara-kerja" class={mobileLinkClass} onclick={closeMenu}>Cara kerja</a>
        <a href="#manfaat" class={mobileLinkClass} onclick={closeMenu}>Manfaat</a>
        <a href="#faq" class={mobileLinkClass} onclick={closeMenu}>FAQ</a>
        <a href="/login" class="btn-primary mt-2">Masuk ke akun</a>
      </div>
    </div>
  {/if}
</header>

<main id="konten">
<!-- Hero: full-bleed image -->
<section class="relative isolate overflow-hidden bg-ink [--color-focus:#fff]">
  <img
    src="/hero.webp"
    width="1920"
    height="1080"
    alt=""
    aria-hidden="true"
    class="absolute inset-0 -z-20 h-full w-full object-cover object-center"
    loading="eager"
    fetchpriority="high"
    decoding="async"
  />
  <!-- Scrim: keeps the copy readable on top of any photo -->
  <div class="absolute inset-0 -z-10 bg-black/60" aria-hidden="true"></div>
  <div
    class="absolute inset-0 -z-10 bg-gradient-to-b from-black/70 via-black/35 to-black/70"
    aria-hidden="true"
  ></div>
  <!-- Smooth fade into the next section -->
  <div
    class="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-b from-transparent to-white"
    aria-hidden="true"
  ></div>

  <div class="mx-auto flex max-w-[1280px] flex-col justify-center px-4 pb-16 pt-28 sm:px-6 sm:pb-24 sm:pt-32">
    <div class="mx-auto max-w-3xl text-center" data-reveal>
      <h1
        class="text-4xl font-bold leading-[1.05] tracking-tight text-balance text-white [text-shadow:0_2px_28px_rgb(0_0_0/0.55)] sm:text-6xl"
      >
        Urus kost dengan tenang,<br class="hidden sm:block" />
        <span class="text-amber-soft">dari kamar sampai pembayaran.</span>
      </h1>
      <p class="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/90 sm:text-lg">
        Panggora menyatukan properti, kamar, penghuni, kontrak, tagihan bulanan, pembayaran, deposit,
        pengeluaran, dan laporan kas dalam satu tempat.
      </p>
      <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
        <a href="/login" class="btn-primary px-6">Masuk ke akun</a>
        <a
          href="#fitur"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          Lihat fitur
        </a>
      </div>
    </div>

    <!-- Desktop app preview: mirrors the real dashboard shell and components -->
    <div class="relative mx-auto mt-10 w-full max-w-6xl mockup-tilt" data-reveal>
      <div
        class="app-card mockup-tilt-card overflow-hidden rounded-2xl shadow-[0_24px_60px_-24px_rgb(24_35_31/0.35)]"
        bind:this={mockupTilt}
      >
        <div class="flex">
          <!-- Sidebar: makes the preview read as the desktop app, hidden on phones -->
          <aside
            class="hidden w-52 shrink-0 flex-col border-r border-line bg-surface/70 lg:flex"
            aria-hidden="true"
          >
            <div class="flex items-center gap-2.5 px-4 py-4">
              <Logo size={34} />
              <span class="min-w-0">
                <span class="block truncate text-[13px] font-bold leading-tight">Panggora</span>
                <span class="block truncate text-[10px] text-muted">Kost Melati</span>
              </span>
            </div>

            <div
              class="mx-3 mb-3 flex items-center gap-2.5 rounded-lg border border-line bg-paper/70 p-2"
            >
              <span
                class="flex size-7 shrink-0 items-center justify-center rounded-md bg-white text-[10px] font-bold text-accent shadow-sm"
              >
                KM
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[11px] font-semibold">Kost Melati</span>
                <span class="block text-[10px] text-muted">Owner</span>
              </span>
            </div>

            <nav class="flex-1 space-y-0.5 px-2">
              {#each previewNav as item (item.label)}
                <span
                  class="flex min-h-8 items-center gap-2.5 rounded-md px-2.5 text-xs font-medium {item.active
                    ? 'bg-accent-soft text-accent-dark'
                    : 'text-muted'}"
                >
                  <item.icon size={15} strokeWidth={item.active ? 2.3 : 1.9} />
                  {item.label}
                </span>
              {/each}
            </nav>

            <div class="border-t border-line px-3 py-3">
              <div class="flex items-center gap-2.5">
                <span
                  class="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] font-bold text-accent-dark"
                >
                  BS
                </span>
                <div class="min-w-0">
                  <p class="truncate text-[11px] font-semibold">Budi Santoso</p>
                  <p class="truncate text-[10px] text-muted">budi@kostmelati.id</p>
                </div>
              </div>
            </div>
          </aside>

          <div class="min-w-0 flex-1">
            <!-- App top bar -->
            <div class="flex items-center justify-between gap-3 border-b border-line bg-paper/50 px-4 py-3">
              <div class="flex min-w-0 items-center gap-2.5">
                <span class="lg:hidden"><Logo size={30} /></span>
                <div class="min-w-0">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Ringkasan operasional
                  </p>
                  <p class="truncate text-base font-bold leading-tight sm:text-lg">Beranda</p>
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-2">
                <span class="badge-gray">Pratinjau</span>
                <span class="btn-secondary btn-sm hidden sm:inline-flex">
                  <CalendarDays size={14} /> Laporan
                </span>
                <span class="btn-primary btn-sm hidden sm:inline-flex">
                  <Plus size={14} /> Catat bayar
                </span>
              </div>
            </div>

            <div class="p-3.5 sm:p-4">
              <!-- Same StatCard component as the real dashboard, filled with sample numbers -->
              <div class="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <StatCard
            compact
            label="Tingkat hunian"
            value="87%"
            detail="14 terisi · 2 kosong"
            tone="accent"
          >
            {#snippet icon()}<DoorOpen size={14} />{/snippet}
          </StatCard>
          <StatCard
            compact
            label="Kas diterima"
            value={formatIdr(9800000)}
            detail="Periode 1–31 Okt"
            tone="accent"
          >
            {#snippet icon()}<Wallet size={14} />{/snippet}
          </StatCard>
          <StatCard
            compact
            label="Sisa tagihan"
            value={formatIdr(12400000)}
            detail="Seluruh invoice berjalan"
            tone="amber"
          >
            {#snippet icon()}<ReceiptText size={14} />{/snippet}
          </StatCard>
          <StatCard
            compact
            label="Tunggakan"
            value={formatIdr(1600000)}
            detail="Lewat jatuh tempo"
            tone="danger"
          >
            {#snippet icon()}<CircleDollarSign size={14} />{/snippet}
          </StatCard>
        </div>

              <div class="mt-2.5 grid gap-2.5 lg:grid-cols-[1.5fr_1fr]">
                <!-- Arus kas periode -->
                <section class="rounded-xl border border-line bg-surface p-3.5">
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <p class="text-[11px] font-semibold uppercase tracking-wider text-muted">
                        Arus kas periode
                      </p>
                      <p class="mt-0.5 text-[10px] text-muted">
                        Uang diterima dibanding pengeluaran
                      </p>
                    </div>
                    <span class="badge-green">79% tertagih</span>
                  </div>

                  <div class="mt-2.5 grid grid-cols-3 gap-2">
                    <div class="rounded-lg bg-paper p-2">
                      <p class="text-[10px] font-semibold uppercase tracking-wider text-muted">
                        Kas masuk
                      </p>
                      <p class="mt-0.5 text-xs font-bold tabular-nums text-accent sm:text-sm">
                        {formatIdr(9800000)}
                      </p>
                    </div>
                    <div class="rounded-lg bg-paper p-2">
                      <p class="text-[10px] font-semibold uppercase tracking-wider text-muted">
                        Pengeluaran
                      </p>
                      <p class="mt-0.5 text-xs font-bold tabular-nums text-danger sm:text-sm">
                        {formatIdr(2150000)}
                      </p>
                    </div>
                    <div class="rounded-lg bg-accent-soft p-2">
                      <p class="text-[10px] font-semibold uppercase tracking-wider text-accent-dark">
                        Kas bersih
                      </p>
                      <p class="mt-0.5 text-xs font-bold tabular-nums text-accent-dark sm:text-sm">
                        {formatIdr(7650000)}
                      </p>
                    </div>
                  </div>

                  <div class="mt-2.5 grid gap-1 border-t border-line pt-2.5 sm:grid-cols-2 sm:gap-x-4">
                    <div class="flex items-center justify-between gap-2 text-[11px]">
                      <span class="text-muted">Invoice diterbitkan</span>
                      <span class="font-semibold tabular-nums">{formatIdr(12400000)}</span>
                    </div>
                    <div class="flex items-center justify-between gap-2 text-[11px]">
                      <span class="text-muted">Piutang periode</span>
                      <span class="font-semibold tabular-nums">{formatIdr(4900000)}</span>
                    </div>
                    <div class="flex items-center justify-between gap-2 text-[11px]">
                      <span class="text-muted">Deposit diterima</span>
                      <span class="font-semibold tabular-nums">{formatIdr(1500000)}</span>
                    </div>
                    <div class="flex items-center justify-between gap-2 text-[11px]">
                      <span class="text-muted">Deposit direfund</span>
                      <span class="font-semibold tabular-nums">{formatIdr(0)}</span>
                    </div>
                  </div>

                  <!-- Ringkasan properti: fills the panel like the real dashboard -->
                  <div class="mt-2.5 border-t border-line pt-2">
                    <div class="flex items-center justify-between">
                      <p class="text-[10px] font-semibold uppercase tracking-wider text-muted">
                        Ringkasan properti
                      </p>
                      <span class="text-[10px] font-semibold text-accent">Kelola</span>
                    </div>
                    <ul class="mt-1.5 grid gap-1 sm:grid-cols-2">
                      <li class="flex items-center justify-between gap-2 rounded-lg bg-paper px-2 py-1.5">
                        <div class="min-w-0">
                          <p class="truncate text-[11px] font-semibold">Kost Melati</p>
                          <p class="text-[10px] text-muted">14/16 kamar terisi</p>
                        </div>
                        <span class="shrink-0 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                          87%
                        </span>
                      </li>
                      <li class="flex items-center justify-between gap-2 rounded-lg bg-paper px-2 py-1.5">
                        <div class="min-w-0">
                          <p class="truncate text-[11px] font-semibold">Kost Anggrek</p>
                          <p class="text-[10px] text-muted">8/10 kamar terisi</p>
                        </div>
                        <span class="shrink-0 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                          80%
                        </span>
                      </li>
                    </ul>
                  </div>
                </section>

                <div class="grid gap-2.5">
                  <!-- Jatuh tempo -->
                  <section class="overflow-hidden rounded-xl border border-line bg-surface">
                    <div class="flex items-center justify-between border-b border-line px-3 py-2">
                      <p class="text-[11px] font-semibold uppercase tracking-wider text-muted">
                        Jatuh tempo
                      </p>
                      <span class="text-[10px] font-semibold text-accent">Lihat semua</span>
                    </div>
                    <ul class="divide-y divide-line">
                      <li class="flex items-start justify-between gap-2 px-3 py-2">
                        <div class="min-w-0">
                          <p class="truncate text-xs font-semibold">Rian Hidayat</p>
                          <p class="truncate text-[10px] text-muted">
                            Kost Melati · A-04 · 8 Okt 2026
                          </p>
                        </div>
                        <p class="shrink-0 text-xs font-bold tabular-nums text-danger">
                          {formatIdr(1500000)}
                        </p>
                      </li>
                      <li class="flex items-start justify-between gap-2 px-3 py-2">
                        <div class="min-w-0">
                          <p class="truncate text-xs font-semibold">Siti Aminah</p>
                          <p class="truncate text-[10px] text-muted">
                            Kost Melati · B-03 · 5 Okt 2026
                          </p>
                        </div>
                        <p class="shrink-0 text-xs font-bold tabular-nums text-danger">
                          {formatIdr(1600000)}
                        </p>
                      </li>
                    </ul>
                  </section>

                  <!-- Pembayaran terbaru -->
                  <section class="overflow-hidden rounded-xl border border-line bg-surface">
                    <div class="flex items-center justify-between border-b border-line px-3 py-2">
                      <p class="text-[11px] font-semibold uppercase tracking-wider text-muted">
                        Pembayaran terbaru
                      </p>
                      <span class="text-[10px] font-semibold text-accent">Lihat semua</span>
                    </div>
                    <ul class="divide-y divide-line">
                      <li class="flex items-center justify-between gap-2 px-3 py-2">
                        <div class="flex min-w-0 items-center gap-2">
                          <span
                            class="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"
                          >
                            <ArrowDownRight size={12} />
                          </span>
                          <div class="min-w-0">
                            <p class="truncate text-xs font-semibold">Budi Santoso</p>
                            <p class="truncate text-[10px] text-muted">
                              12 Okt 2026 · Transfer bank
                            </p>
                          </div>
                        </div>
                        <span class="shrink-0 text-xs font-bold tabular-nums text-accent">
                          +{formatIdr(1500000)}
                        </span>
                      </li>
                      <li class="flex items-center justify-between gap-2 px-3 py-2">
                        <div class="flex min-w-0 items-center gap-2">
                          <span
                            class="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"
                          >
                            <ArrowDownRight size={12} />
                          </span>
                          <div class="min-w-0">
                            <p class="truncate text-xs font-semibold">Siti Aminah</p>
                            <p class="truncate text-[10px] text-muted">10 Okt 2026 · Tunai</p>
                          </div>
                        </div>
                        <span class="shrink-0 text-xs font-bold tabular-nums text-accent">
                          +{formatIdr(1600000)}
                        </span>
                      </li>
                    </ul>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Client names: infinite marquee replacing the static stat cards -->
{#snippet partnerCard(name: string)}
  <div class="app-card mx-2 flex h-16 shrink-0 items-center justify-center px-6">
    <p class="whitespace-nowrap text-sm font-bold tracking-tight text-ink/75">{name}</p>
  </div>
{/snippet}

<section class="marquee-section overflow-hidden py-8" aria-label="Pengelola kost yang memakai Panggora">
  <div class="marquee relative" data-reveal>
    <div
      class="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent sm:w-24"
    ></div>
    <div
      class="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent sm:w-24"
    ></div>
    <div class="marquee-track flex w-max">
      <ul class="flex">
        {#each partners as name (name)}
          <li>{@render partnerCard(name)}</li>
        {/each}
      </ul>
      <!-- Second copy makes the loop seamless; hidden from assistive tech. -->
      <ul class="flex" aria-hidden="true">
        {#each partners as name (name)}
          <li>{@render partnerCard(name)}</li>
        {/each}
      </ul>
    </div>
  </div>
</section>

  <!-- Fitur bento -->
  <section id="fitur" class="mx-auto max-w-[1280px] scroll-mt-20 px-4 py-12 sm:px-6">
    <div class="max-w-2xl" data-reveal>
      <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">Fitur</p>
      <h2 class="mt-2 text-2xl font-bold text-balance sm:text-3xl">Semua yang Anda butuhkan untuk mengelola kost.</h2>
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
  <section id="cara-kerja" class="mx-auto max-w-[1280px] scroll-mt-20 px-4 py-12 sm:px-6">
    <div class="max-w-2xl" data-reveal>
      <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">Cara kerja</p>
      <h2 class="mt-2 text-2xl font-bold text-balance sm:text-3xl">Mulai dalam tiga langkah.</h2>
    </div>
    <div class="relative mt-10 grid gap-6 sm:grid-cols-3" data-reveal>
      <div class="hidden sm:block absolute top-6 left-[16%] right-[16%] h-px bg-gradient-to-r from-accent/20 via-accent to-accent/20" aria-hidden="true"></div>
      <div class="relative app-card p-5">
        <span class="relative z-10 flex size-11 items-center justify-center rounded-full bg-accent text-sm font-bold text-white ring-4 ring-white">1</span>
        <h3 class="mt-4 text-base font-bold">Tambah properti & kamar</h3>
        <p class="mt-1 text-sm text-muted">Daftarkan lokasi kost dan kamar-kamarnya.</p>
      </div>
      <div class="relative app-card p-5">
        <span class="relative z-10 flex size-11 items-center justify-center rounded-full bg-accent text-sm font-bold text-white ring-4 ring-white">2</span>
        <h3 class="mt-4 text-base font-bold">Masukkan penghuni & kontrak</h3>
        <p class="mt-1 text-sm text-muted">Buat kontrak sewa dengan harga dan periode.</p>
      </div>
      <div class="relative app-card p-5">
        <span class="relative z-10 flex size-11 items-center justify-center rounded-full bg-accent text-sm font-bold text-white ring-4 ring-white">3</span>
        <h3 class="mt-4 text-base font-bold">Kelola tagihan & kas</h3>
        <p class="mt-1 text-sm text-muted">Generate tagihan, catat pembayaran, lihat laporan.</p>
      </div>
    </div>
  </section>

  <!-- Manfaat -->
  <section id="manfaat" class="scroll-mt-20 border-y border-line bg-white py-14 sm:py-20">
    <div class="mx-auto max-w-[1280px] px-4 sm:px-6">
      <div class="max-w-2xl" data-reveal>
        <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">Manfaat</p>
        <h2 class="mt-2 text-2xl font-bold text-balance sm:text-3xl">
          Yang berubah setelah pindah ke Panggora.
        </h2>
        <p class="mt-2 text-sm text-muted">
          Tiga pekerjaan yang paling sering menyita waktu saat pencatatan masih manual.
        </p>
      </div>

      <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-reveal>
        <div class="app-card p-6">
          <span
            class="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent-soft to-accent/20 text-accent"
          >
            <ReceiptText size={20} aria-hidden="true" />
          </span>
          <h3 class="mt-4 text-base font-bold">Tagihan tidak lagi terlewat</h3>
          <p class="mt-1 text-sm leading-6 text-muted">
            Status lunas dan belum lunas terlihat per kamar, jadi tidak perlu mengecek buku catatan
            satu per satu.
          </p>
        </div>
        <div class="app-card p-6">
          <span
            class="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent-soft to-accent/20 text-accent"
          >
            <Wallet size={20} aria-hidden="true" />
          </span>
          <h3 class="mt-4 text-base font-bold">Rekap kas tanpa hitung ulang</h3>
          <p class="mt-1 text-sm leading-6 text-muted">
            Pemasukan dan pengeluaran bulan berjalan tersaji langsung untuk laporan, tanpa rekap
            manual di akhir bulan.
          </p>
        </div>
        <div class="app-card p-6">
          <span
            class="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent-soft to-accent/20 text-accent"
          >
            <ShieldCheck size={20} aria-hidden="true" />
          </span>
          <h3 class="mt-4 text-base font-bold">Staf tetap terkontrol</h3>
          <p class="mt-1 text-sm leading-6 text-muted">
            Pembayaran yang dicatat staf langsung terlihat di laporan owner, lengkap dengan jejak
            audit.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- FAQ -->
  <section id="faq" class="scroll-mt-20 bg-white py-14 sm:py-20">
    <div class="mx-auto max-w-[1280px] px-4 sm:px-6">
      <div class="max-w-2xl" data-reveal>
        <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">FAQ</p>
        <h2 class="mt-2 text-2xl font-bold text-balance sm:text-3xl">Pertanyaan yang sering diajukan.</h2>
        <p class="mt-2 text-sm text-muted">
          Belum ketemu jawabannya? Kirim email ke
          <a href="mailto:halo@panggora.my.id" class="font-semibold text-accent hover:underline">
            halo@panggora.my.id
          </a>.
        </p>
      </div>

      <div class="mt-8 grid items-start gap-3 lg:grid-cols-2" data-reveal>
        {#each faqs as item}
          <details class="group app-card overflow-hidden">
            <summary
              class="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold text-ink transition-colors hover:bg-neutral-50 [&::-webkit-details-marker]:hidden"
            >
              <span>{item.q}</span>
              <ChevronDown
                size={18}
                class="shrink-0 text-muted transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div class="border-t border-line px-5 py-4 text-sm leading-6 text-muted">
              {item.a}
            </div>
          </details>
        {/each}
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="mx-auto max-w-[1280px] px-4 py-12 sm:px-6">
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent to-accent-dark p-6 text-white shadow-[var(--shadow-card)] [--color-focus:#fff] sm:p-10" data-reveal>
      <div class="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/10 blur-3xl" aria-hidden="true"></div>
      <div class="pointer-events-none absolute -bottom-20 -left-10 size-72 rounded-full bg-amber-soft/20 blur-3xl" aria-hidden="true"></div>
      <div class="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-xl font-bold text-balance sm:text-2xl">Siap mengelola kost dengan lebih tenang?</h2>
          <p class="mt-1 text-sm text-white/80">Masuk ke akun Anda dan mulai hari ini.</p>
        </div>
        <a href="/login" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-accent transition-colors hover:bg-neutral-100">
          Masuk ke akun
        </a>
      </div>
    </div>
  </section>
</main>

  <!-- Footer -->
  <footer class="border-t border-white/10 bg-ink text-white/70 [--color-focus:#fff]">
    <div class="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 sm:py-16">
      <div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div class="max-w-sm lg:col-span-2">
          <a href="#top" class="inline-flex items-center gap-2 rounded-lg text-white">
            <Logo size={36} />
            <span class="text-lg font-bold tracking-tight">Panggora</span>
          </a>
          <p class="mt-4 text-sm leading-6">
            Manajemen kost yang tenang: properti, kamar, penghuni, kontrak, tagihan, pembayaran, dan
            laporan kas dalam satu tempat.
          </p>
          <p class="mt-4 text-xs text-white/50">Dibuat untuk owner &amp; staf kost di Indonesia.</p>
        </div>

        <nav aria-label="Produk">
          <h2 class="text-xs font-bold uppercase tracking-[0.16em] text-white">Produk</h2>
          <ul class="mt-4 space-y-3 text-sm">
            <li><a href="#fitur" class="transition-colors hover:text-white">Fitur</a></li>
            <li><a href="#cara-kerja" class="transition-colors hover:text-white">Cara kerja</a></li>
            <li><a href="#manfaat" class="transition-colors hover:text-white">Manfaat</a></li>
            <li><a href="#faq" class="transition-colors hover:text-white">FAQ</a></li>
            <li><a href="/login" class="transition-colors hover:text-white">Masuk ke akun</a></li>
          </ul>
        </nav>

        <div>
          <h2 class="text-xs font-bold uppercase tracking-[0.16em] text-white">Bantuan</h2>
          <ul class="mt-4 space-y-3 text-sm">
            <li>
              <a
                href="mailto:halo@panggora.my.id"
                class="inline-flex items-center gap-2 transition-colors hover:text-white"
              >
                <Mail size={16} aria-hidden="true" />
                halo@panggora.my.id
              </a>
            </li>
            <li>
              <p class="inline-flex items-center gap-2" role="status">
                <span
                  class="size-2 rounded-full {status === 'ok'
                    ? 'bg-ok'
                    : status === 'down'
                      ? 'bg-danger'
                      : 'bg-white/40'}"
                  aria-hidden="true"
                ></span>
                <span>
                  {status === 'ok'
                    ? 'Semua sistem normal'
                    : status === 'down'
                      ? 'Layanan tidak tersedia'
                      : 'Memeriksa status…'}
                </span>
              </p>
            </li>
          </ul>
        </div>
      </div>

      <div
        class="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs sm:flex-row sm:items-center sm:justify-between"
      >
        <p>© {new Date().getFullYear()} Panggora. Hak cipta dilindungi.</p>
        <a href="#top" class="transition-colors hover:text-white">Kembali ke atas ↑</a>
      </div>
    </div>
  </footer>

  <style>
    /*
     * The landing page uses a pure white canvas instead of the app's warm
     * paper tone. Scoped here so the dashboard keeps its original palette.
     */
    :global(html),
    :global(body) {
      background: #ffffff;
    }
    :global(.app-card) {
      background-color: #ffffff;
    }

    /*
     * Content is visible by default. The reveal is an animation that only
     * starts once JS adds `.is-visible`, so a failed/blocked script can never
     * leave the page blank. `:global()` keeps Svelte from pruning the rule.
     */
    :global([data-reveal].is-visible) {
      animation: reveal-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    @keyframes reveal-up {
      from {
        opacity: 0;
        transform: translateY(16px);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }

    /*
     * 3D scene for the dashboard mockup. The custom properties are driven
     * from scroll progress in the script; without JS they all fall back to
     * their identity values, so the card simply stays flat.
     */
    .mockup-tilt {
      perspective: 900px;
    }

    .mockup-tilt-card {
      transform: translateY(var(--tilt-shift, 0px)) rotateX(var(--tilt-x, 0deg))
        rotateY(var(--tilt-y, 0deg)) scale(var(--tilt-scale, 1));
      transform-origin: center;
      will-change: transform;
    }

    /*
     * Highlight strip: the same four cards rendered twice inside one track.
     * Shifting the track by exactly 50% lands on an identical frame, so the
     * loop never jumps. Items use horizontal margins (not gap) because gap
     * would leave the second copy half a gap short of a clean seam.
     */
    .marquee-track {
      animation: marquee 38s linear infinite;
    }

    .marquee-track:hover {
      animation-play-state: paused;
    }

    @keyframes marquee {
      from {
        transform: translateX(0);
      }
      to {
        transform: translateX(-50%);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      :global([data-reveal].is-visible) {
        animation: none;
      }

      .mockup-tilt-card {
        transform: none;
        will-change: auto;
      }

      /* No motion: drop the duplicate copy and let the strip wrap normally. */
      .marquee-track {
        animation: none;
        width: auto;
        flex-wrap: wrap;
        justify-content: center;
        padding-inline: 1rem;
      }

      .marquee-track > ul {
        flex-wrap: wrap;
        justify-content: center;
      }

      .marquee-track > ul[aria-hidden='true'] {
        display: none;
      }
    }
  </style>
