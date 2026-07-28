'use client';

// ============================================================
// Dedicated Full-Page Event Creation Wizard — /admin/events/create
// Multi-step form with Leveling Rules, Tenant Booth Setup, & Real-time House Breakdown
// Super App Cluster Martinez
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Ticket,
  Layers,
  Store,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  Building2,
  MapPin,
  Clock,
} from 'lucide-react';
import type { IuranMatrixRow } from '@/types';
import { createEventAndGenerateKupons } from '@/lib/event-store';

const STORAGE_KEY_IURAN = 'martinez_iuran_matrix_v2';

export default function CreateEventPage() {
  const router = useRouter();

  // Form Basic Info State
  const [namaEvent, setNamaEvent] = useState('');
  const [namaKupon, setNamaKupon] = useState('Kupon Acara Utama');
  const [tanggalEvent, setTanggalEvent] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [lokasiEvent, setLokasiEvent] = useState(
    'Club House Martinez'
  );

  // Multi-Category Coupon Manager State (Default 1 Category)
  const [categories, setCategories] = useState<
    { id: string; nama_kategori: string }[]
  >([{ id: 'cat-1', nama_kategori: 'Kupon Makanan Utama' }]);

  // Dynamic Tier Rules Manager State (Default 1 Tier)
  const [tiers, setTiers] = useState<
    {
      id: string;
      nama_tier: string;
      min_lunas_bulan: number;
      kupon_per_category: Record<string, number>;
    }[]
  >([
    {
      id: 'tr-1',
      nama_tier: 'Tier Full Bayar',
      min_lunas_bulan: 12,
      kupon_per_category: { 'cat-1': 1 },
    },
  ]);

  // Category Management Handlers
  const handleAddCategory = () => {
    const newId = `cat-${Date.now()}`;
    const newCat = {
      id: newId,
      nama_kategori: `Kupon Jenis #${categories.length + 1}`,
    };
    setCategories([...categories, newCat]);

    // Update all tiers to include new category initialized to 1
    setTiers((prevTiers) =>
      prevTiers.map((t) => ({
        ...t,
        kupon_per_category: { ...t.kupon_per_category, [newId]: 1 },
      }))
    );
  };

  const handleRemoveCategory = (id: string) => {
    if (categories.length <= 1) {
      alert('Minimal 1 Jenis Kupon wajib ada.');
      return;
    }
    setCategories(categories.filter((c) => c.id !== id));
  };

  const handleCategoryNameChange = (id: string, name: string) => {
    setCategories(
      categories.map((c) => (c.id === id ? { ...c, nama_kategori: name } : c))
    );
  };

  // Tier Management Handlers
  const handleAddTier = () => {
    const newId = `tr-${Date.now()}`;
    const initialKuponMap: Record<string, number> = {};
    categories.forEach((c) => {
      initialKuponMap[c.id] = 1;
    });

    setTiers([
      ...tiers,
      {
        id: newId,
        nama_tier: `Tier Rule #${tiers.length + 1}`,
        min_lunas_bulan: 1,
        kupon_per_category: initialKuponMap,
      },
    ]);
  };

  const handleRemoveTier = (id: string) => {
    if (tiers.length <= 1) {
      alert('Minimal 1 Tier Rule wajib ada.');
      return;
    }
    setTiers(tiers.filter((t) => t.id !== id));
  };

  const handleTierChange = (
    id: string,
    field: 'nama_tier' | 'min_lunas_bulan',
    val: string | number
  ) => {
    setTiers(
      tiers.map((t) =>
        t.id === id
          ? {
              ...t,
              [field]: field === 'min_lunas_bulan' ? Number(val) : val,
            }
          : t
      )
    );
  };

  const handleTierKuponQtyChange = (
    tierId: string,
    catId: string,
    qty: number
  ) => {
    setTiers(
      tiers.map((t) =>
        t.id === tierId
          ? {
              ...t,
              kupon_per_category: {
                ...t.kupon_per_category,
                [catId]: Math.max(0, qty),
              },
            }
          : t
      )
    );
  };

  // Tenant Booth Accounts State (Default 1 Booth)
  const [booths, setBooths] = useState<
    { id: string; nama_booth: string; username: string; password: string }[]
  >([
    {
      id: '1',
      nama_booth: 'Booth Makanan #1',
      username: 'booth-1',
      password: 'event123',
    },
  ]);

  // Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [countdown, setCountdown] = useState<number>(3);

  // 3-Second Countdown Effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showConfirmModal && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showConfirmModal, countdown]);

  // Real-time Preview Calculation Breakdown across Cluster Houses
  const previewBreakdown = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const savedIuran = localStorage.getItem(STORAGE_KEY_IURAN);
      let matrix: IuranMatrixRow[] = [];
      if (savedIuran) {
        matrix = JSON.parse(savedIuran);
      }

      const sortedTiers = [...tiers].sort(
        (a, b) => b.min_lunas_bulan - a.min_lunas_bulan
      );
      const tierHouseCounts: Record<string, number> = {};
      const categoryTotals: Record<string, number> = {};

      tiers.forEach((t) => {
        tierHouseCounts[t.id] = 0;
      });
      categories.forEach((c) => {
        categoryTotals[c.id] = 0;
      });

      let grandTotalKupons = 0;
      let unqualifiedHouses = 0;

      matrix.forEach((row) => {
        let lunasCount = 0;
        for (let m = 1; m <= 12; m++) {
          const val = row.bulan[m] || (row.bulan as any)[m.toString()];
          if (val === 'lunas') lunasCount++;
        }

        const matchedTier = sortedTiers.find((t) => lunasCount >= t.min_lunas_bulan);

        if (matchedTier) {
          tierHouseCounts[matchedTier.id] =
            (tierHouseCounts[matchedTier.id] || 0) + 1;

          categories.forEach((cat) => {
            const qty = matchedTier.kupon_per_category[cat.id] || 0;
            categoryTotals[cat.id] = (categoryTotals[cat.id] || 0) + qty;
            grandTotalKupons += qty;
          });
        } else {
          unqualifiedHouses++;
        }
      });

      return {
        totalHouses: matrix.length,
        tierHouseCounts,
        unqualifiedHouses,
        categoryTotals,
        grandTotalKupons,
      };
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [categories, tiers]);

  // Booth Management Handlers
  const handleAddBooth = () => {
    const nextIdx = booths.length + 1;
    setBooths([
      ...booths,
      {
        id: Date.now().toString(),
        nama_booth: `Booth Makanan #${nextIdx}`,
        username: `booth-${nextIdx}`,
        password: 'event123',
      },
    ]);
  };

  const handleRemoveBooth = (id: string) => {
    if (booths.length <= 1) {
      alert('Minimal 1 Tenant Booth wajib terdaftar.');
      return;
    }
    setBooths(booths.filter((b) => b.id !== id));
  };

  const handleBoothChange = (
    id: string,
    field: 'nama_booth' | 'username' | 'password',
    val: string
  ) => {
    setBooths(
      booths.map((b) => {
        if (b.id !== id) return b;
        if (field === 'nama_booth') {
          const cleanSlug = val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
          const autoUsername = cleanSlug ? (cleanSlug.startsWith('booth') ? cleanSlug : `booth-${cleanSlug}`) : b.username;
          return {
            ...b,
            nama_booth: val,
            username: autoUsername,
          };
        }
        return { ...b, [field]: val };
      })
    );
  };

  // Submit Step 1 -> Open Step 2 Confirm Modal
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaEvent.trim()) {
      alert('Nama Event Acara Wajib Diisi!');
      return;
    }
    setCountdown(3);
    setShowConfirmModal(true);
  };

  // Final Execute Event Creation
  const handleFinalExecute = async () => {
    try {
      const savedIuran = localStorage.getItem(STORAGE_KEY_IURAN);
      let matrix: IuranMatrixRow[] = [];
      if (savedIuran) {
        matrix = JSON.parse(savedIuran);
      }

      const res = await createEventAndGenerateKupons(
        {
          nama_event: namaEvent,
          nama_kupon: namaKupon,
          tanggal_event: tanggalEvent,
          lokasi_event: lokasiEvent,
          rules: { categories, tiers },
          booths,
        },
        matrix
      );

      if (res.cloudOk === false) {
        alert(`⚠️ Event berhasil dibuat di lokal, namun GAGAL di-sync ke Cloud: ${res.error}. Warga belum bisa melihat kupon ini.`);
      }

      router.push('/admin/events');
    } catch (err) {
      console.error(err);
      alert('Gagal menerbitkan event!');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16 animate-fade-in">
      {/* ── Back & Header ────────────────────────────────────── */}
      <div>
        <button
          onClick={() => router.push('/admin/events')}
          className="flex items-center gap-2 text-xs font-bold text-surface-500 hover:text-surface-900 dark:hover:text-white mb-4 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Daftar Event & Kupon
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-500 to-primary-500 flex items-center justify-center shadow-lg shadow-accent-500/20">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
              Buat Event Acara & Peraturan Kupon
            </h1>
            <p className="text-sm text-surface-700/60 dark:text-surface-200/50 mt-0.5">
              Halaman khusus pembuatan event, pengaturan jatah kupon berjenjang, & registrasi booth makanan
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-8">
        {/* ── SECTION 1: INFORMASI ACARA & JENIS KUPON ─────────── */}
        <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 p-6 lg:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-surface-100 dark:border-surface-800">
            <Ticket className="w-5 h-5 text-accent-500" />
            <h2 className="font-bold text-base text-surface-900 dark:text-white">
              1. Informasi Event & Jenis/Kategori Kupon
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block font-bold text-surface-700 dark:text-surface-200 mb-1">
                Nama Event Acara *
              </label>
              <input
                type="text"
                value={namaEvent}
                onChange={(e) => setNamaEvent(e.target.value)}
                placeholder="Contoh: HUT RI Kluster Martinez"
                required
                className="w-full p-3.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-2xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/30"
              />
            </div>

            <div>
              <label className="block font-bold text-surface-700 dark:text-surface-200 mb-1">
                Tanggal Pelaksanaan *
              </label>
              <input
                type="date"
                value={tanggalEvent}
                onChange={(e) => setTanggalEvent(e.target.value)}
                required
                className="w-full p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-surface-700 dark:text-surface-200 mb-1">
                Lokasi Event Acara *
              </label>
              <input
                type="text"
                value={lokasiEvent}
                onChange={(e) => setLokasiEvent(e.target.value)}
                placeholder="Lapangan Serbaguna Kluster Martinez"
                required
                className="w-full p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl"
              />
            </div>
          </div>

          {/* Dynamic Multi-Category Coupon Manager */}
          <div className="pt-4 border-t border-surface-100 dark:border-surface-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block font-bold text-surface-900 dark:text-white text-xs">
                  Jenis / Kategori Kupon Ditawarkan
                </label>
                <p className="text-[11px] text-surface-500">
                  Satu event dapat menerbitkan beberapa jenis kupon (misal: Kupon Makanan Berat, Makanan Ringan, Doorprize).
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddCategory}
                className="flex items-center gap-1 px-3 py-1.5 bg-accent-500/10 text-accent-600 dark:text-accent-400 hover:bg-accent-500/20 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Jenis Kupon
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((cat, cIdx) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-2 p-2.5 bg-surface-50 dark:bg-surface-800/60 rounded-xl border border-surface-200 dark:border-surface-700"
                >
                  <span className="w-6 h-6 rounded-lg bg-accent-500/20 text-accent-600 dark:text-accent-400 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                    #{cIdx + 1}
                  </span>
                  <input
                    type="text"
                    value={cat.nama_kategori}
                    onChange={(e) =>
                      handleCategoryNameChange(cat.id, e.target.value)
                    }
                    placeholder="Nama Jenis Kupon"
                    required
                    className="flex-1 p-2 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg text-xs font-bold"
                  />
                  {categories.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(cat.id)}
                      className="p-2 text-danger-500 hover:bg-danger-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Hapus Jenis Kupon"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── SECTION 2: PENGATURAN PERATURAN TIER KUPON DINAMIS ── */}
        <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 p-6 lg:p-8 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-surface-100 dark:border-surface-800">
            <div className="flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-primary-500" />
              <div>
                <h2 className="font-bold text-base text-surface-900 dark:text-white">
                  2. Pengaturan Peraturan Tier Kupon Dinamis
                </h2>
                <p className="text-xs text-surface-500">
                  Atur tier aturan kupon secara bebas & fleksibel. Tambahkan tier baru sesuai kebutuhan event acara.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddTier}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-500/20 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah Tier Rules
            </button>
          </div>

          <div className="space-y-4">
            {tiers.map((tier, tIdx) => (
              <div
                key={tier.id}
                className="p-5 bg-surface-50 dark:bg-surface-800/60 rounded-2xl border border-surface-200 dark:border-surface-700 space-y-4 text-xs"
              >
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-surface-200 dark:border-surface-700">
                  <div className="flex-1 flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-primary-500/20 text-primary-600 dark:text-primary-400 font-bold rounded-lg text-[10px]">
                      TIER #{tIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={tier.nama_tier}
                      onChange={(e) =>
                        handleTierChange(tier.id, 'nama_tier', e.target.value)
                      }
                      placeholder="Nama Tier (misal: Tier Full Bayar)"
                      required
                      className="flex-1 p-2 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl font-bold text-sm"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-surface-500 font-bold">
                        Syarat Min. Lunas:
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="12"
                        value={tier.min_lunas_bulan}
                        onChange={(e) =>
                          handleTierChange(
                            tier.id,
                            'min_lunas_bulan',
                            e.target.value
                          )
                        }
                        className="w-16 p-1.5 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg text-center font-bold text-xs"
                      />
                      <span className="text-[11px] text-surface-500">Bulan</span>
                    </div>

                    {tiers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTier(tier.id)}
                        className="p-2 text-danger-500 hover:bg-danger-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Tier Rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Coupon Multiplier Inputs Per Category for this Tier */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-surface-500 mb-2">
                    Jatah Kupon Yang Didapatkan Per Rumah:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="p-3 bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 flex items-center justify-between gap-2"
                      >
                        <span className="font-semibold text-surface-700 dark:text-surface-200 text-xs truncate">
                          {cat.nama_kategori}:
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={tier.kupon_per_category[cat.id] ?? 0}
                            onChange={(e) =>
                              handleTierKuponQtyChange(
                                tier.id,
                                cat.id,
                                Number(e.target.value)
                              )
                            }
                            className="w-14 p-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-center font-bold text-xs text-primary-600 dark:text-primary-400"
                          />
                          <span className="text-[10px] text-surface-400">Kpn</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SECTION 3: PENGATURAN AKUN BOOTH / TENANT MAKANAN ── */}
        <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 p-6 lg:p-8 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-surface-100 dark:border-surface-800">
            <div className="flex items-center gap-2.5">
              <Store className="w-5 h-5 text-accent-500" />
              <div>
                <h2 className="font-bold text-base text-surface-900 dark:text-white">
                  3. Registrasi Akun Tenant / Booth Makanan
                </h2>
                <p className="text-xs text-surface-500">
                  Buat akun login khusus untuk penjaga booth agar dapat me-scan QR Code kupon warga.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddBooth}
              className="flex items-center gap-1.5 px-3 py-2 bg-accent-500/10 text-accent-600 dark:text-accent-400 hover:bg-accent-500/20 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah Tenant Booth
            </button>
          </div>

          <div className="space-y-3">
            {booths.map((booth, idx) => (
              <div
                key={booth.id}
                className="p-4 bg-surface-50 dark:bg-surface-800/60 rounded-2xl border border-surface-200 dark:border-surface-700 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs"
              >
                <div className="sm:col-span-4">
                  <label className="block text-[10px] font-bold uppercase text-surface-500 mb-1">
                    Nama Tenant / Booth #{idx + 1}
                  </label>
                  <input
                    type="text"
                    value={booth.nama_booth}
                    onChange={(e) =>
                      handleBoothChange(booth.id, 'nama_booth', e.target.value)
                    }
                    placeholder="Nama Booth Makanan"
                    required
                    className="w-full p-2.5 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl font-bold"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold uppercase text-surface-500 mb-1">
                    Username Login
                  </label>
                  <input
                    type="text"
                    value={booth.username}
                    onChange={(e) =>
                      handleBoothChange(booth.id, 'username', e.target.value)
                    }
                    placeholder="Username booth"
                    required
                    className="w-full p-2.5 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl font-mono"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[10px] font-bold uppercase text-surface-500 mb-1">
                    Password Login
                  </label>
                  <input
                    type="text"
                    value={booth.password}
                    onChange={(e) =>
                      handleBoothChange(booth.id, 'password', e.target.value)
                    }
                    placeholder="Password"
                    required
                    className="w-full p-2.5 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl font-mono"
                  />
                </div>

                <div className="sm:col-span-1 flex justify-end sm:pt-4">
                  <button
                    type="button"
                    onClick={() => handleRemoveBooth(booth.id)}
                    className="p-2.5 text-danger-500 hover:bg-danger-500/10 rounded-xl transition-colors cursor-pointer"
                    title="Hapus Booth"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SECTION 4: ESTIMASI PREVIEW & SUBMIT ────────────── */}
        {previewBreakdown && (
          <div className="bg-gradient-to-br from-surface-900 to-surface-800 text-white rounded-3xl p-6 lg:p-8 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-700">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent-400" />
                <h3 className="font-bold text-base">
                  Kalkulasi Real-Time Kupon Kluster
                </h3>
              </div>
              <span className="text-xs text-surface-400 font-mono">
                {previewBreakdown.totalHouses} Unit Rumah
              </span>
            </div>

            {/* Per-Tier House Counts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {tiers.map((tier) => (
                <div key={tier.id} className="p-3 bg-white/5 rounded-2xl border border-white/10">
                  <span className="text-surface-400 block text-[10px] truncate">{tier.nama_tier}:</span>
                  <span className="font-mono font-bold text-primary-400 text-sm">
                    {previewBreakdown.tierHouseCounts[tier.id] || 0} Rumah
                  </span>
                </div>
              ))}
              {previewBreakdown.unqualifiedHouses > 0 && (
                <div className="p-3 bg-danger-500/10 rounded-2xl border border-danger-500/20">
                  <span className="text-danger-300 block text-[10px] truncate">Tidak Memenuhi Syarat:</span>
                  <span className="font-mono font-bold text-danger-400 text-sm">
                    {previewBreakdown.unqualifiedHouses} Rumah (0 Kupon)
                  </span>
                </div>
              )}
            </div>

            {/* Per-Category Kupon Totals */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              {categories.map((cat) => (
                <div key={cat.id} className="p-3 bg-white/5 rounded-2xl border border-white/10">
                  <span className="text-surface-400 block text-[10px] truncate">{cat.nama_kategori}:</span>
                  <span className="font-mono font-bold text-accent-400 text-sm">
                    {previewBreakdown.categoryTotals[cat.id] || 0} Kupon
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-surface-400 block">TOTAL KUPON DITERBITKAN:</span>
                <span className="text-2xl font-bold font-mono text-accent-400">
                  {previewBreakdown.grandTotalKupons} Kupon
                </span>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-accent-500 to-primary-500 hover:from-accent-600 hover:to-primary-600 text-white font-bold text-sm rounded-2xl shadow-xl shadow-accent-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4.5 h-4.5" />
                Lanjut ke Jendela Konfirmasi &rarr;
              </button>
            </div>
          </div>
        )}
      </form>

      {/* ── STEP 2: JENDELA KONFIRMASI & COUNTDOWN MODAL ──────── */}
      {showConfirmModal && previewBreakdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowConfirmModal(false)}
          />
          <div className="relative w-full max-w-lg bg-white dark:bg-surface-900 rounded-3xl shadow-2xl border border-surface-200 dark:border-surface-800 animate-fade-in overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-warning-500 via-accent-500 to-primary-500" />
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-warning-500/10 text-warning-500">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-surface-900 dark:text-white">
                    Konfirmasi Menerbitkan Event & Kupon
                  </h3>
                  <p className="text-xs text-surface-500">
                    Konfirmasi penerbitan massal untuk event "{namaEvent}".
                  </p>
                </div>
              </div>

              <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 space-y-2 text-xs">
                {tiers.map((tier) => (
                  <div key={tier.id} className="flex justify-between text-surface-700 dark:text-surface-200">
                    <span>{tier.nama_tier} (≥{tier.min_lunas_bulan} bln):</span>
                    <strong>{previewBreakdown.tierHouseCounts[tier.id] || 0} Rumah</strong>
                  </div>
                ))}

                <div className="pt-2 border-t border-surface-200 dark:border-surface-700 space-y-1">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex justify-between text-accent-600 dark:text-accent-400">
                      <span>{cat.nama_kategori}:</span>
                      <strong>{previewBreakdown.categoryTotals[cat.id] || 0} Kupon</strong>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-surface-200 dark:border-surface-700 flex justify-between items-center text-sm font-bold">
                  <span className="text-surface-900 dark:text-white">TOTAL KUPON DITERBITKAN:</span>
                  <span className="font-mono text-accent-600 dark:text-accent-400">{previewBreakdown.grandTotalKupons} Kupon</span>
                </div>
                <div className="flex justify-between text-surface-500 pt-1 text-[11px]">
                  <span>Akun Tenant Booth Terdaftar:</span>
                  <strong>{booths.length} Booth Makanan</strong>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-surface-600 cursor-pointer"
                >
                  &larr; Ubah Form
                </button>
                <button
                  type="button"
                  disabled={countdown > 0}
                  onClick={handleFinalExecute}
                  className={`
                    px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-lg
                    ${
                      countdown > 0
                        ? 'bg-surface-300 dark:bg-surface-700 text-surface-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-accent-500 to-primary-500 text-white shadow-accent-500/30 hover:brightness-110'
                    }
                  `}
                >
                  <Sparkles className="w-4 h-4" />
                  {countdown > 0
                    ? `Konfirmasi & Terbitkan (${countdown}s)`
                    : 'Konfirmasi & Terbitkan Massal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
