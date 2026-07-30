'use client';

// ============================================================
// Settings Page — /admin/settings
// Configures Iuran Rate (Default Rp 50.000 / month = Rp 600.000 / year),
// Bank Transfer Details ((BLU) BCA Digital 002238893889 a/n Devy Octaviana), and Start Date.
// Super App Cluster Martinez
// ============================================================

import { useState, useEffect } from 'react';
import {
  Settings,
  Coins,
  Calendar,
  Save,
  Check,
  Shield,
  FileText,
  Building,
  Info,
  CreditCard,
  User,
  Trash2,
  AlertTriangle,
  Clock,
  Loader2,
  Database,
  Copy,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { UserRole } from '@/types';
import {
  getIuranConfigFromStorage,
  saveIuranConfigToStorage,
  DEFAULT_IURAN_CONFIG,
  type IuranConfig,
} from '@/lib/config-store';
import { clearAllCloudData, checkSupabaseTableStatus, getMissingTablesSQL, type TableStatus } from '@/lib/db-sync';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'iuran' | 'info' | 'reset' | 'database'>('iuran');
  const [userRole, setUserRole] = useState<UserRole>('superadmin');
  const [config, setConfig] = useState<IuranConfig>(DEFAULT_IURAN_CONFIG);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── Reset All Data Modal with 5s Countdown State ────────────
  const [showResetModal, setShowResetModal] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isResetting, setIsResetting] = useState(false);

  // ── Database Setup State ────────────────────────────────────
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; tables: TableStatus[] } | null>(null);
  const [dbChecking, setDbChecking] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  const canEdit = userRole === 'superadmin' || userRole === 'pengurus' || userRole === 'bendahara';
  const isSuperAdmin = userRole === 'superadmin';

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showResetModal && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showResetModal, countdown]);

  const handleOpenResetModal = () => {
    if (!isSuperAdmin) return;
    setCountdown(5);
    setShowResetModal(true);
  };

  const handleConfirmResetAllData = async () => {
    if (countdown > 0 || isResetting) return;
    setIsResetting(true);

    try {
      const res = await clearAllCloudData();
      if (res.success) {
        showToast('✨ Reset Berhasil! Seluruh data warga, iuran, dan event di peramban & Cloud Supabase telah dikosongkan.');
      } else {
        showToast(`⚠️ Reset selesai secara lokal. Catatan Supabase: ${res.error}`);
      }
    } catch (e) {
      showToast('Seluruh data lokal berhasil dikosongkan.');
    } finally {
      setIsResetting(false);
      setShowResetModal(false);
    }
  };

  useEffect(() => {
    const stored = sessionStorage.getItem('demo_user');
    if (stored) {
      const u = JSON.parse(stored);
      setUserRole(u.role);
    }

    setConfig(getIuranConfigFromStorage());
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    if (config.nominal_per_bulan <= 0) {
      alert('Nominal iuran harus lebih besar dari 0!');
      return;
    }

    const updated: IuranConfig = {
      ...config,
      updated_at: new Date().toISOString(),
    };

    setConfig(updated);
    
    // Save and wait for cloud sync result
    const res = await saveIuranConfigToStorage(updated);
    
    if (res && res.cloudOk === false) {
      showToast(
        `⚠️ Tersimpan di Lokal, tapi GAGAL ke Cloud Supabase: ${res.error}`
      );
    } else {
      showToast(
        `✅ Pengaturan iuran berhasil disimpan! Tarif Rp ${config.nominal_per_bulan.toLocaleString(
          'id-ID'
        )} / bulan (Rp ${(config.nominal_per_bulan * 12).toLocaleString('id-ID')} / tahun).`
      );
    }
  };

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto animate-fade-in">
      {/* ── Toast Notification ───────────────────────────────── */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-5 py-3.5 bg-surface-900 text-white rounded-2xl shadow-2xl border border-white/10 animate-fade-in text-sm font-medium">
          <Check className="w-4 h-4 text-success-400 flex-shrink-0" />
          {toastMessage}
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 shadow-lg shadow-primary-500/20">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-surface-900 dark:text-white">
              Pengaturan Sistem
            </h1>
            <p className="text-sm text-surface-700/60 dark:text-surface-200/50 mt-0.5">
              Atur tarif iuran bulanan (Rp 50.000 / bulan = Rp 600.000 / tahun), rekening bank, & pengumuman
            </p>
          </div>
        </div>
      </div>

      {/* Role notice for bendahara */}
      {!canEdit && (
        <div className="flex items-center gap-3 p-4 bg-warning-400/10 border border-warning-400/20 rounded-xl text-sm text-warning-500 animate-fade-in">
          <Shield className="w-5 h-5 flex-shrink-0" />
          <p>
            <strong>Mode View-Only:</strong> Sebagai Bendahara, Anda hanya dapat melihat konfigurasi pengaturan.
          </p>
        </div>
      )}

      {/* ── Tab Switcher ─────────────────────────────────────── */}
      <div className="flex bg-white dark:bg-surface-900 p-1.5 rounded-2xl border border-surface-200 dark:border-surface-800 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('iuran')}
          className={`
            flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer
            ${
              activeTab === 'iuran'
                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
            }
          `}
        >
          <Coins className="w-4 h-4" />
          Pengaturan Iuran & Rekening Bank
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={`
            flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer
            ${
              activeTab === 'info'
                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
            }
          `}
        >
          <Building className="w-4 h-4" />
          Profil Kluster & Info Sistem
        </button>

        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('reset')}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer
              ${
                activeTab === 'reset'
                  ? 'bg-danger-500 text-white shadow-md shadow-danger-500/20'
                  : 'text-danger-500 hover:bg-danger-500/10'
              }
            `}
          >
            <Trash2 className="w-4 h-4" />
            Reset All Data (Danger Zone)
          </button>
        )}

        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer
              ${
                activeTab === 'database'
                  ? 'bg-accent-500 text-white shadow-md shadow-accent-500/20'
                  : 'text-accent-600 dark:text-accent-400 hover:bg-accent-500/10'
              }
            `}
          >
            <Database className="w-4 h-4" />
            Database Setup
          </button>
        )}
      </div>

      {/* ── TAB 1: PENGATURAN IURAN & REKENING BANK ──────────── */}
      {activeTab === 'iuran' && (
        <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 p-6 lg:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-surface-100 dark:border-surface-800">
            <Coins className="w-5 h-5 text-primary-500" />
            <div>
              <h2 className="text-base font-bold text-surface-900 dark:text-white">
                Konfigurasi Tarif Iuran & Rekening Pembayaran
              </h2>
              <p className="text-xs text-surface-500">
                Tarif dan info rekening bank ini akan tampil secara otomatis di Portal Warga.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nominal Iuran Bulanan */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-surface-900 dark:text-white">
                  Nominal Iuran Bulanan (per Rumah)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-surface-500 text-sm">
                    Rp
                  </span>
                  <input
                    type="number"
                    value={config.nominal_per_bulan}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        nominal_per_bulan: Number(e.target.value),
                      })
                    }
                    disabled={!canEdit}
                    placeholder="50000"
                    required
                    className="w-full pl-12 pr-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl font-mono text-base font-bold text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
                  />
                </div>
                <p className="text-xs text-primary-600 dark:text-primary-400 font-semibold mt-1.5 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  RP {config.nominal_per_bulan.toLocaleString('id-ID')} / bulan = Rp {(config.nominal_per_bulan * 12).toLocaleString('id-ID')} / tahun
                </p>
              </div>

              {/* Tanggal Mulai (Start Date) */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-surface-900 dark:text-white">
                  Tanggal Mulai Berlaku (Start Date)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="date"
                    value={config.start_date}
                    onChange={(e) =>
                      setConfig({ ...config, start_date: e.target.value })
                    }
                    disabled={!canEdit}
                    required
                    className="w-full pl-12 pr-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl font-mono text-sm font-bold text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all cursor-pointer"
                  />
                </div>
                <p className="text-xs text-surface-500 mt-1.5">
                  Mulai berlakunya penagihan tarif iuran ini.
                </p>
              </div>
            </div>

            {/* Rekening Bank Settings */}
            <div className="p-4 bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Data Rekening Bank Kas Bendahara Kluster
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-surface-700 dark:text-surface-300">
                    Nama Bank / Penyedia
                  </label>
                  <input
                    type="text"
                    value={config.nama_bank}
                    onChange={(e) => setConfig({ ...config, nama_bank: e.target.value })}
                    disabled={!canEdit}
                    placeholder="(BLU) BCA Digital"
                    className="w-full px-3 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs font-semibold text-surface-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-surface-700 dark:text-surface-300">
                    Nomor Rekening
                  </label>
                  <input
                    type="text"
                    value={config.no_rekening}
                    onChange={(e) => setConfig({ ...config, no_rekening: e.target.value })}
                    disabled={!canEdit}
                    placeholder="002238893889"
                    className="w-full px-3 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs font-mono font-bold text-surface-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-surface-700 dark:text-surface-300">
                    Atas Nama Rekening
                  </label>
                  <input
                    type="text"
                    value={config.atas_nama}
                    onChange={(e) => setConfig({ ...config, atas_nama: e.target.value })}
                    disabled={!canEdit}
                    placeholder="Devy Octaviana"
                    className="w-full px-3 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs font-semibold text-surface-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Nama Iuran */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-surface-900 dark:text-white">
                Nama / Judul Iuran
              </label>
              <div className="relative">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  type="text"
                  value={config.nama_iuran}
                  onChange={(e) =>
                    setConfig({ ...config, nama_iuran: e.target.value })
                  }
                  disabled={!canEdit}
                  placeholder="Contoh: Iuran Bulanan Kluster Martinez"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm font-medium text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
                />
              </div>
            </div>

            {/* Save Button */}
            {canEdit && (
              <div className="pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold text-sm rounded-xl shadow-lg shadow-primary-500/25 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Simpan Pengaturan Iuran
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* ── TAB 2: PROFIL KLUSTER & INFO ─────────────────────── */}
      {activeTab === 'info' && (
        <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 p-6 lg:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-surface-100 dark:border-surface-800">
            <Building className="w-5 h-5 text-primary-500" />
            <div>
              <h2 className="text-base font-bold text-surface-900 dark:text-white">
                Informasi Kluster Martinez
              </h2>
              <p className="text-xs text-surface-500">
                Informasi umum perumahan dan pengurus RW/RT.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="p-5 bg-surface-50 dark:bg-surface-800/50 rounded-2xl space-y-2 border border-surface-200 dark:border-surface-700">
              <span className="text-xs font-bold uppercase tracking-wider text-primary-500 block">
                Struktur Wilayah & Pengurus
              </span>
              <p className="font-semibold text-surface-900 dark:text-white">
                RW 037 — Kluster Martinez
              </p>
              <p className="text-xs text-surface-500 leading-relaxed">
                Seluruh Ketua RT 01 s.d. RT 05 yang bertugas & Pengurus RW 037.
              </p>
            </div>

            <div className="p-5 bg-surface-50 dark:bg-surface-800/50 rounded-2xl space-y-2 border border-surface-200 dark:border-surface-700">
              <span className="text-xs font-bold uppercase tracking-wider text-accent-500 block">
                Metode Autentikasi
              </span>
              <p className="font-semibold text-surface-900 dark:text-white">
                Dual Login Architecture
              </p>
              <p className="text-xs text-surface-500 leading-relaxed">
                • <strong>Pengurus & Admin</strong>: Username & Password<br />
                • <strong>Warga</strong>: Nomor Rumah & Password (MTZ-XXXXX)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: RESET ALL DATA (DANGER ZONE) ──────────────── */}
      {activeTab === 'reset' && (
        <div className="bg-white dark:bg-surface-900 rounded-3xl border border-danger-500/30 dark:border-danger-500/20 p-6 lg:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-danger-500/10">
            <div className="p-2.5 rounded-xl bg-danger-500/10 text-danger-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-danger-600 dark:text-danger-400">
                Danger Zone — Factory Reset All Data
              </h2>
              <p className="text-xs text-surface-500">
                Hapus seluruh database master warga, matriks iuran, dan event acara dari sistem.
              </p>
            </div>
          </div>

          <div className="p-5 bg-danger-500/5 border border-danger-500/15 rounded-2xl space-y-3">
            <h3 className="text-sm font-bold text-danger-700 dark:text-danger-400 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Tindakan Ini Bersifat Permanen!
            </h3>
            <p className="text-xs text-surface-700/80 dark:text-surface-200/70 leading-relaxed">
              Tindakan ini akan mengosongkan <strong>seluruh data master warga</strong>, <strong>matriks iuran bulanan</strong>, <strong>event acara kupon doorprize</strong>, dan <strong>akun tenant booth</strong> baik dari Penyimpanan Peramban Lokal maupun dari <strong>Database Cloud Supabase</strong>.
            </p>

            {isSuperAdmin ? (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOpenResetModal}
                  className="flex items-center gap-2 px-5 py-2.5 bg-danger-500 hover:bg-danger-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-danger-500/25 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Reset Semua Data (Factory Reset)
                </button>
              </div>
            ) : (
              <p className="text-xs font-bold text-danger-500">
                Akses Dibatasi: Hanya akun Superadmin yang dapat melakukan Factory Reset.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: DATABASE SETUP ──────────────────────────────── */}
      {activeTab === 'database' && (
        <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 p-6 lg:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-surface-100 dark:border-surface-800">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-accent-500" />
              <div>
                <h2 className="text-base font-bold text-surface-900 dark:text-white">
                  Status Database Supabase
                </h2>
                <p className="text-xs text-surface-500 mt-0.5">
                  Periksa tabel mana yang sudah ada dan mana yang perlu dibuat.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                setDbChecking(true);
                const result = await checkSupabaseTableStatus();
                setDbStatus(result);
                setDbChecking(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-accent-500/20"
            >
              {dbChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {dbChecking ? 'Memeriksa...' : 'Cek Status Database'}
            </button>
          </div>

          {!dbStatus && !dbChecking && (
            <div className="text-center py-8 text-surface-500">
              <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold">Klik tombol &quot;Cek Status Database&quot; di atas</p>
              <p className="text-xs mt-1">untuk memeriksa tabel mana yang sudah tersedia di Supabase.</p>
            </div>
          )}

          {dbStatus && !dbStatus.connected && (
            <div className="p-4 bg-danger-500/10 border border-danger-500/20 rounded-2xl text-sm text-danger-600 dark:text-danger-400 font-semibold flex items-center gap-3">
              <XCircle className="w-5 h-5 flex-shrink-0" />
              Supabase TIDAK terhubung. Pastikan Environment Variables NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY sudah diset di Vercel.
            </div>
          )}

          {dbStatus && dbStatus.connected && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {dbStatus.tables.map((t) => (
                  <div
                    key={t.name}
                    className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                      t.exists && !t.error
                        ? 'bg-success-500/5 border-success-500/20'
                        : 'bg-danger-500/5 border-danger-500/20'
                    }`}
                  >
                    {t.exists && !t.error ? (
                      <CheckCircle2 className="w-5 h-5 text-success-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-danger-500 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-xs font-bold text-surface-900 dark:text-white font-mono">{t.name}</p>
                      {t.exists && !t.error ? (
                        <p className="text-[10px] text-success-600 dark:text-success-400 font-medium">
                          ✅ Tersedia ({t.rowCount} rows)
                        </p>
                      ) : (
                        <p className="text-[10px] text-danger-600 dark:text-danger-400 font-medium truncate max-w-[180px]">
                          ❌ {t.error || 'Tabel belum dibuat'}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {dbStatus.tables.some((t) => !t.exists || t.error) && (
                <div className="space-y-4">
                  <div className="p-4 bg-warning-400/10 border border-warning-400/20 rounded-2xl">
                    <h3 className="text-sm font-bold text-warning-700 dark:text-warning-400 flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      Tabel Belum Lengkap — Jalankan SQL Berikut di Supabase
                    </h3>
                    <p className="text-xs text-surface-600 dark:text-surface-300 leading-relaxed">
                      Buka <strong>Supabase Dashboard</strong> → <strong>SQL Editor</strong> → <strong>New Query</strong>, lalu paste dan jalankan SQL di bawah ini.
                      Setelah selesai, klik &quot;Cek Status Database&quot; lagi untuk memastikan semua ✅.
                    </p>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(getMissingTablesSQL());
                        setSqlCopied(true);
                        setTimeout(() => setSqlCopied(false), 3000);
                      }}
                      className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-accent-500 hover:bg-accent-600 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer z-10 shadow-md"
                    >
                      {sqlCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {sqlCopied ? 'Tersalin!' : 'Salin SQL'}
                    </button>
                    <pre className="bg-surface-950 text-green-400 text-[10px] font-mono p-4 rounded-2xl overflow-x-auto max-h-[400px] overflow-y-auto border border-surface-700 leading-relaxed">
                      {getMissingTablesSQL()}
                    </pre>
                  </div>
                </div>
              )}

              {dbStatus.tables.every((t) => t.exists && !t.error) && (
                <div className="p-4 bg-success-500/10 border border-success-500/20 rounded-2xl text-sm text-success-700 dark:text-success-400 font-bold flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  Semua tabel sudah tersedia di Supabase! Database siap digunakan 100%.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── 5 SECOND COUNTDOWN CONFIRMATION MODAL FOR FACTORY RESET ── */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isResetting && setShowResetModal(false)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-3xl shadow-2xl border border-surface-200 dark:border-surface-800 animate-fade-in overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-danger-500 via-warning-500 to-danger-600" />
            <div className="p-6 lg:p-8 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-danger-500/10 text-danger-500 shadow-inner">
                <AlertTriangle className="w-7 h-7" />
              </div>

              <h3 className="text-xl font-extrabold text-surface-900 dark:text-white">
                HAPUS SELURUH DATA SISTEM?
              </h3>

              <p className="text-xs text-surface-700/80 dark:text-surface-200/70 leading-relaxed">
                Yakin ingin menghapus <strong>seluruh data warga, data rumah, matriks iuran, event acara, dan kupon</strong> dari Browser dan Cloud Supabase? Tindakan ini <strong>TIDAK DAPAT DIBATALKAN</strong>.
              </p>

              {/* Countdown badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-danger-500/10 rounded-2xl text-xs font-mono font-bold text-danger-600 dark:text-danger-400">
                <Clock className="w-4 h-4 animate-spin" />
                {countdown > 0 ? (
                  <span>Harap tunggu {countdown} detik...</span>
                ) : (
                  <span>Tombol Hapus Sekarang Aktif!</span>
                )}
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  disabled={isResetting}
                  className="px-5 py-2.5 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 text-surface-700 dark:text-surface-200 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleConfirmResetAllData}
                  disabled={countdown > 0 || isResetting}
                  className={`
                    flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all cursor-pointer text-white
                    ${
                      countdown > 0 || isResetting
                        ? 'bg-surface-400 opacity-50 cursor-not-allowed shadow-none'
                        : 'bg-danger-500 hover:bg-danger-600 shadow-danger-500/30'
                    }
                  `}
                >
                  {isResetting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {isResetting
                    ? 'Menghapus Data...'
                    : countdown > 0
                    ? `Menunggu (${countdown}s)...`
                    : 'Ya, Hapus & Reset Semua Data'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
