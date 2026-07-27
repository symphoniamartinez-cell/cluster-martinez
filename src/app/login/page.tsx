'use client';

// ============================================================
// Login Page — /login
// Dedicated Login Modes:
// 1. Warga Login — Nomor Rumah + Kode Aktivasi
// 2. Admin Login — Username + Password (Default: Martinez.2021)
// Super App Cluster Martinez
// ============================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Home,
  User,
  KeyRound,
  LogIn,
  Loader2,
  Building2,
  ShieldCheck,
  Eye,
  EyeOff,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { authenticateAdmin, authenticateWarga } from '@/lib/user-store';

export default function LoginPage() {
  const router = useRouter();
  const [loginTab, setLoginTab] = useState<'warga' | 'admin'>('warga');

  // Warga Form State
  const [nomorRumah, setNomorRumah] = useState('');
  const [kodeAktivasi, setKodeAktivasi] = useState('');

  // Admin Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleWargaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

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
        setError(res.error || 'Nomor rumah atau kode aktivasi salah.');
      }
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await new Promise((r) => setTimeout(r, 400));
      const res = authenticateAdmin(username, password);

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

        if (res.user.role === 'booth') {
          router.push('/booth');
        } else {
          router.push('/admin');
        }
      } else {
        setError(res.error || 'Username atau password admin salah.');
      }
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-surface-900 to-accent-600/30" />

      {/* Animated background orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-pulse-soft" />
      <div
        className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl animate-pulse-soft"
        style={{ animationDelay: '1s' }}
      />

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 mb-3 shadow-lg shadow-primary-500/30">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Cluster Martinez
          </h1>
          <p className="text-surface-200/70 text-sm mt-1">
            Super App Manajemen Warga & Iuran
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card rounded-2xl p-6 lg:p-8 shadow-2xl">
          {/* Tab Selector: Warga vs Admin */}
          <div className="flex bg-white/5 p-1 rounded-xl mb-6 border border-white/10">
            <button
              type="button"
              onClick={() => {
                setLoginTab('warga');
                setError('');
              }}
              className={`
                flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer
                ${
                  loginTab === 'warga'
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                    : 'text-surface-200/60 hover:text-white'
                }
              `}
            >
              <Home className="w-4 h-4" />
              Portal Warga
            </button>

            <button
              type="button"
              onClick={() => {
                setLoginTab('admin');
                setError('');
              }}
              className={`
                flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer
                ${
                  loginTab === 'admin'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                    : 'text-surface-200/60 hover:text-white'
                }
              `}
            >
              <ShieldAlert className="w-4 h-4" />
              Login Admin / Pengurus
            </button>
          </div>

          {/* ── MODE 1: LOGIN WARGA (Nomor Rumah + Kode Aktivasi) ── */}
          {loginTab === 'warga' ? (
            <form onSubmit={handleWargaSubmit} className="space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-primary-400" />
                <h2 className="text-sm font-semibold text-white">
                  Masuk Warga (Nomor Rumah & Kode Aktivasi)
                </h2>
              </div>

              {/* Nomor Rumah */}
              <div>
                <label
                  htmlFor="nomor-rumah"
                  className="block text-xs font-medium text-surface-200/80 mb-1.5"
                >
                  Nomor Rumah
                </label>
                <div className="relative">
                  <Home className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-200/40" />
                  <input
                    id="nomor-rumah"
                    type="text"
                    value={nomorRumah}
                    onChange={(e) => setNomorRumah(e.target.value)}
                    placeholder="Contoh: MTNU3/2"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-surface-200/30 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all font-mono font-bold"
                  />
                </div>
              </div>

              {/* Kode Aktivasi */}
              <div>
                <label
                  htmlFor="kode-aktivasi"
                  className="block text-xs font-medium text-surface-200/80 mb-1.5"
                >
                  Kode Aktivasi Warga
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-200/40" />
                  <input
                    id="kode-aktivasi"
                    type="text"
                    value={kodeAktivasi}
                    onChange={(e) => setKodeAktivasi(e.target.value)}
                    placeholder="Masukkan kode aktivasi (contoh: ACT001)"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-surface-200/30 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all font-mono font-bold tracking-wider"
                  />
                </div>
                <p className="text-[11px] text-surface-200/40 mt-1">
                  Kode aktivasi didapatkan dari Pengurus / Pengurus RT Anda.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-danger-500/10 border border-danger-500/20 rounded-xl text-danger-400 text-xs animate-fade-in">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer text-sm"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <LogIn className="w-5 h-5" />
                )}
                {loading ? 'Memproses...' : 'Masuk Portal Warga'}
              </button>
            </form>
          ) : (
            /* ── MODE 2: LOGIN ADMIN (Username + Password) ── */
            <form onSubmit={handleAdminSubmit} className="space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-white">
                  Login Admin (Superadmin / Pengurus / Bendahara)
                </h2>
              </div>

              {/* Username */}
              <div>
                <label
                  htmlFor="admin-username"
                  className="block text-xs font-medium text-surface-200/80 mb-1.5"
                >
                  Username Admin
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-200/40" />
                  <input
                    id="admin-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ADMIN / PENGURUS / BENDAHARA"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-surface-200/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all font-mono font-bold uppercase"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-medium text-surface-200/80 mb-1.5"
                >
                  Password Admin
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-200/40" />
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password admin"
                    required
                    className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-surface-200/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all font-mono font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-200/40 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-danger-500/10 border border-danger-500/20 rounded-xl text-danger-400 text-xs animate-fade-in">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer text-sm"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <LogIn className="w-5 h-5" />
                )}
                {loading ? 'Memproses...' : 'Masuk Dashboard Admin'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-surface-200/30 mt-6">
          © 2026 Cluster Martinez. All rights reserved.
        </p>
      </div>
    </div>
  );
}
