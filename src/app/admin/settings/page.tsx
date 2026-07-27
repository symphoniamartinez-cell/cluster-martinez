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
} from 'lucide-react';
import type { UserRole } from '@/types';
import {
  getIuranConfigFromStorage,
  saveIuranConfigToStorage,
  DEFAULT_IURAN_CONFIG,
  type IuranConfig,
} from '@/lib/config-store';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'iuran' | 'info'>('iuran');
  const [userRole, setUserRole] = useState<UserRole>('superadmin');
  const [config, setConfig] = useState<IuranConfig>(DEFAULT_IURAN_CONFIG);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const canEdit = userRole === 'superadmin' || userRole === 'pengurus';

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

  const handleSaveConfig = (e: React.FormEvent) => {
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

    saveIuranConfigToStorage(updated);
    setConfig(updated);
    showToast(
      `Pengaturan iuran berhasil disimpan! Tarif Rp ${config.nominal_per_bulan.toLocaleString(
        'id-ID'
      )} / bulan (Rp ${(config.nominal_per_bulan * 12).toLocaleString('id-ID')} / tahun).`
    );
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
                • <strong>Pengurus & Admin</strong>: Username & Password (Default: <code className="font-mono text-primary-500">Martinez.2021</code>)<br />
                • <strong>Warga</strong>: Nomor Rumah & Kode Aktivasi
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
