<script lang="ts">
  import { api, ApiError } from '#lib/api.js';
  import { Eye, EyeOff, LoaderCircle, LogIn } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let email = $state('');
  let password = $state('');
  let showPassword = $state(false);
  let loading = $state(false);
  let errorMessage = $state('');

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    errorMessage = '';
    loading = true;
    try {
      await api('/auth/sign-in/email', {
        body: { email: email.trim(), password },
      });
      window.location.href = data.next.startsWith('/') ? data.next : '/dashboard';
    } catch (error) {
      if (error instanceof ApiError) {
        errorMessage = error.status === 401 ? 'Email atau kata sandi tidak sesuai.' : error.message;
      } else {
        errorMessage = 'Tidak dapat masuk. Coba lagi.';
      }
      loading = false;
    }
  }
</script>

<svelte:head><title>Masuk · Panggora</title></svelte:head>

<div class="grid min-h-dvh lg:grid-cols-[1.05fr_0.95fr]">
  <section
    class="relative hidden overflow-hidden bg-[#123c34] p-12 text-white lg:flex lg:flex-col lg:justify-between"
  >
    <div
      class="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,#f5e6b8_0,transparent_35%),radial-gradient(circle_at_80%_70%,#57b89f_0,transparent_40%)]"
    ></div>
    <div class="relative">
      <span
        class="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-xl font-black backdrop-blur"
        >P</span
      >
      <p class="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-white/60">Panggora</p>
      <h1 class="mt-3 max-w-lg text-4xl font-bold leading-[1.1]">
        Urus kost dengan tenang, dari kamar sampai pembayaran.
      </h1>
      <p class="mt-5 max-w-md text-sm leading-6 text-white/70">
        Satu tempat untuk memantau hunian, membuat tagihan bulanan, mencatat pembayaran, dan melihat
        arus kas properti Anda.
      </p>
    </div>
    <div class="relative grid max-w-lg grid-cols-3 gap-3">
      {#each ['Kamar & penghuni', 'Tagihan otomatis', 'Laporan kas'] as item}
        <div
          class="rounded-xl border border-white/15 bg-white/5 p-3 text-xs font-medium text-white/80"
        >
          {item}
        </div>
      {/each}
    </div>
  </section>

  <section class="flex items-center justify-center px-5 py-10 sm:px-10">
    <div class="w-full max-w-md">
      <div class="mb-8 flex items-center gap-3 lg:hidden">
        <span
          class="flex size-10 items-center justify-center rounded-xl bg-accent text-lg font-black text-white"
          >P</span
        >
        <div>
          <p class="font-bold leading-tight">Panggora</p>
          <p class="text-xs text-muted">Manajemen kost</p>
        </div>
      </div>

      <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">Selamat datang</p>
      <h2 class="mt-2 text-3xl font-bold">Masuk ke akun</h2>
      <p class="mt-2 text-sm text-muted">Gunakan akun owner atau staf yang sudah terdaftar.</p>

      <form class="mt-8 space-y-4" onsubmit={submit}>
        <div class="field">
          <label class="label" for="email">Email</label>
          <input
            id="email"
            class="input"
            type="email"
            autocomplete="email"
            placeholder="nama@email.com"
            bind:value={email}
            required
          />
        </div>
        <div class="field">
          <label class="label" for="password">Kata sandi</label>
          <div class="relative">
            <input
              id="password"
              class="input pr-12"
              type={showPassword ? 'text' : 'password'}
              autocomplete="current-password"
              placeholder="Masukkan kata sandi"
              bind:value={password}
              required
            />
            <button
              type="button"
              class="absolute right-1 top-0 flex size-11 items-center justify-center text-muted"
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              onclick={() => (showPassword = !showPassword)}
            >
              {#if showPassword}<EyeOff size={18} />{:else}<Eye size={18} />{/if}
            </button>
          </div>
        </div>

        {#if errorMessage}
          <div
            class="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
            role="alert"
          >
            {errorMessage}
          </div>
        {/if}

        <button class="btn-primary w-full" type="submit" disabled={loading}>
          {#if loading}
            <LoaderCircle size={18} class="animate-spin" /> Memeriksa…
          {:else}
            <LogIn size={18} /> Masuk
          {/if}
        </button>
      </form>

      <p class="mt-6 text-center text-xs text-muted">
        Akun staf dibuat oleh owner melalui halaman Pengaturan. Registrasi publik tidak tersedia.
      </p>
    </div>
  </section>
</div>
