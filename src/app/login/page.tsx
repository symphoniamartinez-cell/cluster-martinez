'use client';

// ============================================================
// Login Page — /login
// Main Form: Portal Warga (Nomor Rumah & Password)
// Direct Links Below for:
// 1. Login Pengurus / Admin (Modal Popup)
// 2. Login Tenant Booth Event (Modal Popup)
// Super App Cluster Martinez
// ============================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authenticateBooth } from '@/lib/event-store';
import {
  Home,
  User,
  KeyRound,
  LogIn,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
  ShieldAlert,
  Store,
  X,
  UserCog,
} from 'lucide-react';
import { authenticateAdmin, authenticateWarga } from '@/lib/user-store';

export default function LoginPage() {
  const router = useRouter();

  // Warga Main Form State
  const [nomorRumah, setNomorRumah] = useState('');
  const [kodeAktivasi, setKodeAktivasi] = useState('');
  const [loadingWarga, setLoadingWarga] = useState(false);
  const [errorWarga, setErrorWarga] = useState('');

  // Admin Modal State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [errorAdmin, setErrorAdmin] = useState('');

  // Booth Modal State
  const [showBoothModal, setShowBoothModal] = useState(false);
  const [boothUsername, setBoothUsername] = useState('');
  const [boothPassword, setBoothPassword] = useState('');
  const [showBoothPass, setShowBoothPass] = useState(false);
  const [loadingBooth, setLoadingBooth] = useState(false);
  const [errorBooth, setErrorBooth] = useState('');

  // ── Warga Login Submit ─────────────────────────────────────
  const handleWargaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorWarga('');
    setLoadingWarga(true);

    try {
      await new Promise((r) => setTimeout(r, 400));
      const res = authenticateWarga(nomorRumah, kodeAktivasi);

      if (res.success && res.user) {
        const sessionData = {
          id: res.user.id,
          label: res.user.nama,
          nomor: res.user.username,
          role: 'warga',
        };

        sessionStorage.setItem('demo_user', JSON.stringify(sessionData));
        document.cookie = `demo_user=${encodeURIComponent(
          JSON.stringify(sessionData)
        )}; path=/; max-age=86400`;

        router.push('/dashboard');
      } else {
        setErrorWarga(res.error || 'Nomor rumah atau password warga salah.');
      }
    } catch {
      setErrorWarga('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoadingWarga(false);
    }
  };

  // ── Admin Login Submit ─────────────────────────────────────
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAdmin('');
    setLoadingAdmin(true);

    try {
      await new Promise((r) => setTimeout(r, 400));
      const res = authenticateAdmin(adminUsername, adminPassword);

      if (res.success && res.user) {
        const sessionData = {
          id: res.user.id,
          label: res.user.nama,
          nomor: res.user.username,
          role: res.user.role,
        };

        sessionStorage.setItem('demo_user', JSON.stringify(sessionData));
        document.cookie = `demo_user=${encodeURIComponent(
          JSON.stringify(sessionData)
        )}; path=/; max-age=86400`;

        router.push('/admin/dashboard');
      } else {
        setErrorAdmin(res.error || 'Username atau password admin salah.');
      }
    } catch {
      setErrorAdmin('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoadingAdmin(false);
    }
  };

  // ── Booth Login Submit ─────────────────────────────────────
  const handleBoothSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBooth('');
    setLoadingBooth(true);

    try {
      await new Promise((r) => setTimeout(r, 400));
      const res = await authenticateBooth(boothUsername, boothPassword);

      if (res.success && res.booth) {
        const sessionData = {
          id: res.booth.id,
          label: res.booth.nama_booth,
          nomor: res.booth.username,
          role: 'booth',
        };

        sessionStorage.setItem('demo_user', JSON.stringify(sessionData));
        document.cookie = `demo_user=${encodeURIComponent(
          JSON.stringify(sessionData)
        )}; path=/; max-age=86400`;

        router.push('/booth');
      } else {
        setErrorBooth(res.error || 'Username booth atau password booth salah.');
      }
    } catch {
      setErrorBooth('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoadingBooth(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-surface-950">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-950 via-surface-950 to-accent-950/40" />

      {/* Animated background orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse-soft" />
      <div
        className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl animate-pulse-soft"
        style={{ animationDelay: '1s' }}
      />

      <div className="relative w-full max-w-md animate-fade-in my-8">
        {/* Logo Header */}
        <div className="text-center mb-6">
          <img
            src="/logo.jpg"
            alt="Cluster Martinez Logo"
            className="w-20 h-20 rounded-2xl mx-auto mb-3 object-contain bg-white p-2 shadow-2xl shadow-primary-500/20 border border-white/20"
          />
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Cluster Martinez
          </h1>
          <p className="text-surface-300 text-xs mt-1 font-medium">
            Super App Manajemen Warga & Iuran
          </p>
        </div>

        {/* ── MAIN CARD: PORTAL WARGA LOGIN FORM ──────────────── */}
        <div className="glass-card rounded-3xl p-6 lg:p-8 shadow-2xl border border-white/10 bg-surface-900/80 backdrop-blur-xl">
          <div className="flex items-center justify-center gap-2 mb-6 pb-4 border-b border-white/10 text-center">
            <ShieldCheck className="w-5 h-5 text-primary-400" />
            <h2 className="text-base font-bold text-white">
              Login Portal Warga
            </h2>
          </div>

          <form onSubmit={handleWargaSubmit} className="space-y-5">
            {/* Nomor Rumah */}
            <div>
              <label
                htmlFor="nomor-rumah"
                className="block text-xs font-semibold text-surface-200/90 mb-1.5"
              >
                Nomor Rumah
              </label>
              <div className="relative">
                <Home className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  id="nomor-rumah"
                  type="text"
                  value={nomorRumah}
                  onChange={(e) => setNomorRumah(e.target.value)}
                  placeholder="Contoh: MTNU3/2 atau MTNR/11"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all font-mono font-bold"
                />
              </div>
            </div>

            {/* Password Warga */}
            <div>
              <label
                htmlFor="kode-aktivasi"
                className="block text-xs font-semibold text-surface-200/90 mb-1.5"
              >
                Password Warga
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  id="kode-aktivasi"
                  type="text"
                  value={kodeAktivasi}
                  onChange={(e) => setKodeAktivasi(e.target.value)}
                  placeholder="Masukkan Password (contoh: MTZ-7K9P2)"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all font-mono font-bold tracking-wider"
                />
              </div>
              <p className="text-[11px] text-surface-400 mt-1">
                Password Warga didapatkan dari Pengurus / Ketua RT Anda.
              </p>
            </div>

            {/* Error Message */}
            {errorWarga && (
              <div className="flex items-center gap-2 p-3.5 bg-danger-500/10 border border-danger-500/20 rounded-2xl text-danger-400 text-xs animate-fade-in font-medium">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                {errorWarga}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loadingWarga}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-bold rounded-2xl shadow-lg shadow-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer text-sm"
            >
              {loadingWarga ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              {loadingWarga ? 'Memproses Login...' : 'Masuk Portal Warga'}
            </button>
          </form>
        </div>

        {/* ── SECONDARY LOGIN LINKS BELOW (Pengurus & Booth Tenant) ── */}
        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            onClick={() => {
              setShowAdminModal(true);
              setErrorAdmin('');
            }}
            className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-semibold text-surface-200 transition-all cursor-pointer group"
          >
            <span className="flex items-center gap-2">
              <UserCog className="w-4 h-4 text-amber-400" />
              Login sebagai <strong>Pengurus / Admin</strong>
            </span>
            <span className="text-[11px] text-amber-400 group-hover:underline">
              Buka Login Admin &rarr;
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowBoothModal(true);
              setErrorBooth('');
            }}
            className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-semibold text-surface-200 transition-all cursor-pointer group"
          >
            <span className="flex items-center gap-2">
              <Store className="w-4 h-4 text-accent-400" />
              Login sebagai <strong>Tenant Booth Event</strong>
            </span>
            <span className="text-[11px] text-accent-400 group-hover:underline">
              Buka Login Booth &rarr;
            </span>
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-surface-400 mt-6">
          © 2026 Cluster Martinez. All rights reserved.
        </p>
      </div>

      {/* ── MODAL 1: LOGIN PENGURUS / ADMIN ───────────────────── */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-surface-900 border border-white/10 rounded-3xl p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <UserCog className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold">Login Pengurus / Admin</h3>
              </div>
              <button
                onClick={() => setShowAdminModal(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-surface-200 mb-1.5">
                  Username Admin
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="ADMIN / PENGURUS / BENDAHARA"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-mono font-bold uppercase text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-200 mb-1.5">
                  Password Admin
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type={showAdminPass ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Masukkan password admin"
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPass(!showAdminPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white cursor-pointer"
                  >
                    {showAdminPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {errorAdmin && (
                <div className="p-3 bg-danger-500/10 border border-danger-500/20 rounded-xl text-danger-400 text-xs font-medium">
                  {errorAdmin}
                </div>
              )}

              <button
                type="submit"
                disabled={loadingAdmin}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/25 disabled:opacity-50 cursor-pointer text-sm"
              >
                {loadingAdmin ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                {loadingAdmin ? 'Memproses...' : 'Masuk Dashboard Admin'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: LOGIN TENANT BOOTH EVENT ──────────────────── */}
      {showBoothModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-surface-900 border border-white/10 rounded-3xl p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Store className="w-5 h-5 text-accent-400" />
                <h3 className="text-base font-bold">Login Tenant Booth Event</h3>
              </div>
              <button
                onClick={() => setShowBoothModal(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBoothSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-surface-200 mb-1.5">
                  Username / Nama Booth Tenant
                </label>
                <div className="relative">
                  <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="text"
                    value={boothUsername}
                    onChange={(e) => setBoothUsername(e.target.value)}
                    placeholder="Contoh: BOOTH_KULINER1"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-accent-500/50 font-mono font-bold uppercase text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-200 mb-1.5">
                  Password Booth
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type={showBoothPass ? 'text' : 'password'}
                    value={boothPassword}
                    onChange={(e) => setBoothPassword(e.target.value)}
                    placeholder="Masukkan password booth"
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-accent-500/50 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBoothPass(!showBoothPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white cursor-pointer"
                  >
                    {showBoothPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {errorBooth && (
                <div className="p-3 bg-danger-500/10 border border-danger-500/20 rounded-xl text-danger-400 text-xs font-medium">
                  {errorBooth}
                </div>
              )}

              <button
                type="submit"
                disabled={loadingBooth}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-accent-500 to-primary-500 hover:from-accent-600 hover:to-primary-600 text-white font-bold rounded-xl shadow-lg shadow-accent-500/25 disabled:opacity-50 cursor-pointer text-sm"
              >
                {loadingBooth ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                {loadingBooth ? 'Memproses...' : 'Masuk Dashboard Booth'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
