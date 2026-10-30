<script lang="ts">
  import { onMount } from 'svelte';
  import {
    ChevronDown,
    DoorOpen,
    FileText,
    Mail,
    Menu,
    Quote,
    ReceiptText,
    ShieldCheck,
    Star,
    Users,
    Wallet,
    X,
  } from 'lucide-svelte';

  let scrolled = $state(false);
  let menuOpen = $state(false);

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

  const testimonials = [
    {
      quote:
        'Dulu saya catat tagihan di buku dan sering ada yang terlewat. Sekarang semua kamar, kontrak, dan status bayar kelihatan dalam satu layar.',
      name: 'Rani Kusuma',
      role: 'Owner · Kost Melati, Bandung',
      initials: 'RK',
    },
    {
      quote:
        'Yang paling membantu itu rekap kas bulanan. Saya tidak perlu lagi menghitung ulang pemasukan dan pengeluaran secara manual.',
      name: 'Adi Nugroho',
      role: 'Owner · Griya Cempaka, Yogyakarta',
      initials: 'AN',
    },
    {
      quote:
        'Staf saya cukup buka dari HP untuk mencatat pembayaran. Riwayatnya rapi dan saya tetap bisa mengawasi lewat laporan.',
      name: 'Siti Rahmawati',
      role: 'Pengelola · Kost Sejahtera, Surabaya',
      initials: 'SR',
    },
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

    return () => {
      window.removeEventListener('scroll', onScroll);
      io?.disconnect();
    };
  });

  function closeMenu() {
    menuOpen = false;
  }
</script>

<svelte:head>
  <title>Panggora — Manajemen kost yang tenang</title>
  <meta
    name="description"
    content="Panggora membantu owner kost mengelola kamar, penghuni, tagihan, pembayaran, deposit, pengeluaran, dan laporan kas dari satu tempat."
  />
  <link rel="preload" as="image" href="/hero.jpg" fetchpriority="high" />
</svelte:head>

<!-- Navbar -->
<header
  id="top"
  class="fixed inset-x-0 top-0 z-50 transition-colors duration-300 {solidNav
    ? 'border-b border-line bg-white/90 text-ink backdrop-blur-md'
    : 'bg-gradient-to-b from-black/60 via-black/25 to-transparent text-white'}"
>
  <nav
    class="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6"
    aria-label="Navigasi utama"
  >
    <a href="#top" class="flex items-center gap-2 rounded-lg">
      <span
        class="flex size-9 items-center justify-center rounded-xl bg-accent text-sm font-black text-white shadow-sm"
        aria-hidden="true"
      >
        P
      </span>
      <span class="text-lg font-bold tracking-tight">Panggora</span>
    </a>

    <div class="hidden items-center gap-1 md:flex">
      <a href="#fitur" class={navLinkClass}>Fitur</a>
      <a href="#cara-kerja" class={navLinkClass}>Cara kerja</a>
      <a href="#testimoni" class={navLinkClass}>Testimoni</a>
      <a href="#faq" class={navLinkClass}>FAQ</a>
      <a href="/login" class="btn-primary ml-2 px-5">Masuk</a>
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
        <a href="#testimoni" class={mobileLinkClass} onclick={closeMenu}>Testimoni</a>
        <a href="#faq" class={mobileLinkClass} onclick={closeMenu}>FAQ</a>
        <a href="/login" class="btn-primary mt-2">Masuk ke akun</a>
      </div>
    </div>
  {/if}
</header>

<!-- Hero: full-bleed image -->
<section class="relative isolate overflow-hidden bg-ink">
  <img
    src="/hero.jpg"
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
        class="text-4xl font-bold leading-[1.05] tracking-tight text-white [text-shadow:0_2px_28px_rgb(0_0_0/0.55)] sm:text-6xl"
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
        <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div class="rounded-xl border border-line bg-neutral-50 p-3">
            <p class="text-[10px] font-semibold uppercase tracking-wider text-muted">Kamar terisi</p>
            <p class="mt-0.5 text-xl font-bold tabular-nums text-accent">87%</p>
            <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
              <div class="h-full rounded-full bg-accent" style="width: 87%"></div>
            </div>
          </div>
          <div class="rounded-xl border border-line bg-neutral-50 p-3">
            <p class="text-[10px] font-semibold uppercase tracking-wider text-muted">Tagihan bulan ini</p>
            <p class="mt-0.5 text-xl font-bold tabular-nums">Rp 12,4 jt</p>
            <p class="mt-1 text-[11px] text-muted">14 tagihan aktif</p>
          </div>
          <div class="hidden rounded-xl border border-line bg-neutral-50 p-3 sm:block">
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
  <section id="fitur" class="mx-auto max-w-[1280px] scroll-mt-20 px-4 py-12 sm:px-6">
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
  <section id="cara-kerja" class="mx-auto max-w-[1280px] scroll-mt-20 px-4 py-12 sm:px-6">
    <div class="max-w-2xl" data-reveal>
      <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">Cara kerja</p>
      <h2 class="mt-2 text-2xl font-bold sm:text-3xl">Mulai dalam tiga langkah.</h2>
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

  <!-- Testimoni -->
  <section id="testimoni" class="scroll-mt-20 border-y border-line bg-white py-14 sm:py-20">
    <div class="mx-auto max-w-[1280px] px-4 sm:px-6">
      <div class="max-w-2xl" data-reveal>
        <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">Testimoni</p>
        <h2 class="mt-2 text-2xl font-bold sm:text-3xl">Dipakai sehari-hari oleh pengelola kost.</h2>
        <p class="mt-2 text-sm text-muted">
          Cerita singkat dari owner dan staf yang memindahkan pencatatan manual ke Panggora.
        </p>
      </div>

      <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-reveal>
        {#each testimonials as t}
          <figure class="app-card flex h-full flex-col p-6">
            <Quote size={26} class="text-accent/30" aria-hidden="true" />
            <blockquote class="mt-4 flex-1 text-sm leading-7 text-ink">“{t.quote}”</blockquote>
            <div class="mt-5 flex items-center gap-1 text-amber" role="img" aria-label="5 dari 5 bintang">
              {#each Array(5) as _}
                <Star size={14} class="fill-current" aria-hidden="true" />
              {/each}
            </div>
            <figcaption class="mt-4 flex items-center gap-3 border-t border-line pt-4">
              <span
                class="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-dark"
              >
                {t.initials}
              </span>
              <span class="min-w-0">
                <span class="block text-sm font-bold text-ink">{t.name}</span>
                <span class="block text-xs text-muted">{t.role}</span>
              </span>
            </figcaption>
          </figure>
        {/each}
      </div>
    </div>
  </section>

  <!-- FAQ -->
  <section id="faq" class="scroll-mt-20 bg-white py-14 sm:py-20">
    <div class="mx-auto max-w-[1280px] px-4 sm:px-6">
      <div class="max-w-2xl" data-reveal>
        <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">FAQ</p>
        <h2 class="mt-2 text-2xl font-bold sm:text-3xl">Pertanyaan yang sering diajukan.</h2>
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
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent to-accent-dark p-6 text-white shadow-[var(--shadow-card)] sm:p-10" data-reveal>
      <div class="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/10 blur-3xl" aria-hidden="true"></div>
      <div class="pointer-events-none absolute -bottom-20 -left-10 size-72 rounded-full bg-amber-soft/20 blur-3xl" aria-hidden="true"></div>
      <div class="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-xl font-bold sm:text-2xl">Siap mengelola kost dengan lebih tenang?</h2>
          <p class="mt-1 text-sm text-white/80">Masuk ke akun Anda dan mulai hari ini.</p>
        </div>
        <a href="/login" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-accent transition-colors hover:bg-neutral-100">
          Masuk
        </a>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="border-t border-white/10 bg-ink text-white/70">
    <div class="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 sm:py-16">
      <div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div class="max-w-sm lg:col-span-2">
          <a href="#top" class="inline-flex items-center gap-2 rounded-lg text-white">
            <span
              class="flex size-9 items-center justify-center rounded-xl bg-accent text-sm font-black text-white"
            >
              P
            </span>
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
            <li><a href="#testimoni" class="transition-colors hover:text-white">Testimoni</a></li>
            <li><a href="#faq" class="transition-colors hover:text-white">FAQ</a></li>
            <li><a href="/login" class="transition-colors hover:text-white">Masuk</a></li>
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
              <a
                href="/api/health"
                class="inline-flex items-center gap-2 transition-colors hover:text-white"
              >
                <span class="size-2 rounded-full bg-emerald-400" aria-hidden="true"></span>
                Status layanan
              </a>
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

    @media (prefers-reduced-motion: reduce) {
      :global([data-reveal].is-visible) {
        animation: none;
      }
    }
  </style>
