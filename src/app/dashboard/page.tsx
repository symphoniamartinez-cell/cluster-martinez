'use client';

// ============================================================
// Portal Warga Dashboard — /dashboard
// Personal Payment Metrics & Event Coupons for Logged-In Resident
// 100% Real Database Sync by House Number (MTNR/11, MTNU3/2, etc.)
// Super App Cluster Martinez
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import {
  Home,
  CalendarDays,
  Ticket,
  ChevronDown,
  Check,
  X,
  QrCode,
  Sparkles,
  LogOut,
  Building2,
  ShieldCheck,
  Wallet,
  Coins,
  CreditCard,
  Copy,
  Info,
  XCircle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { StatusIuran, KuponAcara, IuranMatrixRow } from '@/types';
import { BULAN_FULL } from '@/types';
import { getMockIuranMatrix } from '@/lib/mock-data';
import { fetchIuranMatrixFromCloud, fetchProfilesFromCloud, fetchKuponsFromCloud, fetchIuranConfigFromCloud } from '@/lib/db-sync';
import { getIuranConfigFromStorage, type IuranConfig } from '@/lib/config-store';
import { getKuponsForWarga } from '@/lib/event-store';
import { createClient } from '@/lib/supabase/client';

const STORAGE_KEY_IURAN = 'martinez_iuran_matrix_v2';

// Helper to normalize house numbers for robust matching (e.g. "MTNR/11" === "mtnr / 11")
const cleanHouseNo = (s: string) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export default function WargaDashboardPage() {
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [nomorRumah, setNomorRumah] = useState('MTNU3/2');
  const [namaWarga, setNamaWarga] = useState('Warga');
  const [rt, setRt] = useState('03');
  const [statusHunian, setStatusHunian] = useState('pemilik');
  const [tanggalMasuk, setTanggalMasuk] = useState('');
  const [iuranData, setIuranData] = useState<Record<number, StatusIuran>>({});
  const [kupons, setKupons] = useState<KuponAcara[]>([]);
  const [selectedKupon, setSelectedKupon] = useState<KuponAcara | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [copiedRekening, setCopiedRekening] = useState(false);
  const [copiedBerita, setCopiedBerita] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugLines, setDebugLines] = useState<string[]>([]);
  const [eventMap, setEventMap] = useState<Record<string, string>>({});

  const [config, setConfig] = useState<IuranConfig>({
    nominal_per_bulan: 50000,
    start_date: '2026-01-01',
    nama_iuran: 'Iuran Bulanan Kluster Martinez',
    nama_bank: '(BLU) BCA Digital',
    no_rekening: '002238893889',
    atas_nama: 'Devy Octaviana',
    rw_info: 'RW 037',
    rt_info: 'Seluruh Ketua RT 01-05 yang bertugas',
    catatan: '',
    updated_at: '',
  });

  const currentMonthNum = new Date().getMonth() + 1; // 1-12
  const currentMonthName = BULAN_FULL[currentMonthNum] || 'Bulan Ini';

  // Dynamic annual rate
  const nominalTahunan = config.nominal_per_bulan * 12;

  // Debug logger helper
  const addDebug = (msg: string) => {
    const ts = new Date().toLocaleTimeString('id-ID');
    setDebugLines((prev) => [`[${ts}] ${msg}`, ...prev.slice(0, 30)]);
    console.log(`[WARGA-DASH] ${msg}`);
  };

  // ── MASTER DATA LOADING ─────────────────────────────────────
  useEffect(() => {
    const stored = sessionStorage.getItem('demo_user');
    let houseNo = 'MTNU3/2';
    let userLabel = '';
    if (stored) {
      const user = JSON.parse(stored);
      houseNo = user.nomor || 'MTNU3/2';
      userLabel = user.label || '';
      setNomorRumah(houseNo);
    }

    // ─── STEP 1: Load config (localStorage first, then cloud override) ───
    const localConfig = getIuranConfigFromStorage();
    setConfig(localConfig);
    addDebug(`📦 localStorage config: Rp ${localConfig.nominal_per_bulan.toLocaleString('id-ID')}/bln`);

    fetchIuranConfigFromCloud().then((cloudCfg) => {
      if (cloudCfg) {
        const merged = { ...localConfig, ...cloudCfg };
        setConfig(merged);
        addDebug(`☁️ Cloud config loaded: Rp ${merged.nominal_per_bulan.toLocaleString('id-ID')}/bln`);
        // Also persist cloud config to localStorage for next load
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('martinez_iuran_config_v1', JSON.stringify(merged));
          } catch (e) {}
        }
      } else {
        addDebug('⚠️ Cloud config: NULL (Supabase tidak terkonfigurasi / tabel belum ada)');
      }
    });

    // ─── STEP 2: Load Iuran Matrix ───
    fetchIuranMatrixFromCloud().then((cloudMatrix) => {
      if (cloudMatrix && cloudMatrix.length > 0) {
        addDebug(`☁️ Cloud iuran matrix: ${cloudMatrix.length} rows`);
        const targetClean = cleanHouseNo(houseNo);
        const matches = cloudMatrix.filter(
          (m) => cleanHouseNo(m.nomor_rumah) === targetClean
        );
        if (matches.length > 0) {
          const targetBulan: Record<number, StatusIuran> = {};
          for (let m = 1; m <= 12; m++) {
            targetBulan[m] = 'belum_lunas';
          }
          matches.forEach((mRow) => {
            if (mRow.rt) setRt(mRow.rt);
            if (mRow.status_hunian) setStatusHunian(mRow.status_hunian);
            for (let m = 1; m <= 12; m++) {
              const val =
                mRow.bulan[m] ||
                (mRow.bulan as any)[m.toString()] ||
                (mRow.bulan as any)[BULAN_FULL[m]];
              if (val === 'lunas') {
                targetBulan[m] = 'lunas';
              }
            }
          });
          setIuranData(targetBulan);
          addDebug(`☁️ Iuran ${houseNo}: matched ${matches.length} rows from cloud`);
        } else {
          addDebug(`⚠️ Cloud iuran: no match for ${houseNo}`);
        }
      } else {
        addDebug('⚠️ Cloud iuran matrix: NULL atau kosong');
      }
    });

    // ─── STEP 3: Load Profiles & Tanggal Masuk ───
    fetchProfilesFromCloud().then((cloudRes) => {
      if (cloudRes && cloudRes.profiles) {
        addDebug(`☁️ Cloud profiles: ${cloudRes.profiles.length} profiles`);
        const targetClean = cleanHouseNo(houseNo);
        const targetRumah = cloudRes.rumahList.find(
          (r) => cleanHouseNo(r.nomor_rumah) === targetClean
        );
        let prof = cloudRes.profiles.find((p) => p.rumah_id === targetRumah?.id);
        if (!prof) {
          prof = cloudRes.profiles.find(
            (p) =>
              cleanHouseNo((p as any).nomor_rumah || '') === targetClean ||
              (p.rumah && cleanHouseNo(p.rumah.nomor_rumah || '') === targetClean)
          );
        }
        if (prof) {
          if (prof.nama && prof.nama !== 'Belum ada nama') {
            setNamaWarga(prof.nama);
          }
          if (prof.tanggal_masuk) {
            setTanggalMasuk(prof.tanggal_masuk);
          }
          addDebug(`☁️ Profile ${houseNo}: ${prof.nama}`);
        }
      } else {
        addDebug('⚠️ Cloud profiles: NULL');
      }
    });

    // ─── STEP 4: Load Kupons (LOCAL + CLOUD merged) ───
    const localKupons = getKuponsForWarga(houseNo);
    addDebug(`📦 localStorage kupons for ${houseNo}: ${localKupons.length}`);
    if (localKupons.length > 0) {
      setKupons(localKupons);
    }

    fetchKuponsFromCloud(houseNo).then((cloudKupons) => {
      if (cloudKupons && cloudKupons.length > 0) {
        addDebug(`☁️ Cloud kupons for ${houseNo}: ${cloudKupons.length}`);
        // Merge: cloud takes priority, deduplicate by id
        const mergedMap = new Map<string, KuponAcara>();
        localKupons.forEach((k) => mergedMap.set(k.id, k));
        cloudKupons.forEach((k) => mergedMap.set(k.id, k));
        setKupons(Array.from(mergedMap.values()));
      } else {
        addDebug(`⚠️ Cloud kupons for ${houseNo}: NULL / 0`);
        // Keep local kupons if any
        if (localKupons.length > 0) {
          setKupons(localKupons);
        }
      }
    });

    // ─── STEP 5: Fallback - also load from localStorage iuran matrix ───
    try {
      const savedIuran = localStorage.getItem(STORAGE_KEY_IURAN);
      let matrix: IuranMatrixRow[] = [];

      if (savedIuran) {
        matrix = JSON.parse(savedIuran);
      } else {
        matrix = getMockIuranMatrix(tahun);
        localStorage.setItem(STORAGE_KEY_IURAN, JSON.stringify(matrix));
      }

      const targetClean = cleanHouseNo(houseNo);
      const matches = matrix.filter(
        (m) => cleanHouseNo(m.nomor_rumah) === targetClean
      );

      let targetBulan: Record<number, StatusIuran> = {};
      let targetRt = '03';
      let targetHunian = 'pemilik';

      for (let m = 1; m <= 12; m++) {
        targetBulan[m] = 'belum_lunas';
      }

      if (matches.length > 0) {
        matches.forEach((mRow) => {
          if (mRow.rt) targetRt = mRow.rt;
          if (mRow.status_hunian) targetHunian = mRow.status_hunian;

          for (let m = 1; m <= 12; m++) {
            const val =
              mRow.bulan[m] ||
              (mRow.bulan as any)[m.toString()] ||
              (mRow.bulan as any)[BULAN_FULL[m]];
            if (val === 'lunas') {
              targetBulan[m] = 'lunas';
            }
          }
        });
      }

      setIuranData((prev) => {
        if (Object.keys(prev).length === 0) return targetBulan;
        return prev;
      });
      setRt((prev) => prev === '03' && targetRt !== '03' ? targetRt : prev);
      setStatusHunian((prev) => prev === 'pemilik' && targetHunian !== 'pemilik' ? targetHunian : prev);

      // Resolve Resident Name & Tanggal Masuk from localStorage profiles
      let realName = '';
      let realTglMasuk = '';
      try {
        const savedRumah = localStorage.getItem('martinez_rumah_list_v3');
        const savedProfiles = localStorage.getItem('martinez_profiles_list_v3');

        if (savedRumah && savedProfiles) {
          const rumahList: any[] = JSON.parse(savedRumah);
          const profilesList: any[] = JSON.parse(savedProfiles);

          const targetRumah = rumahList.find(
            (r) => cleanHouseNo(r.nomor_rumah) === targetClean
          );

          if (targetRumah) {
            const prof = profilesList.find((p) => p.rumah_id === targetRumah.id);
            if (prof) {
              if (prof.nama && prof.nama !== 'Belum ada nama') realName = prof.nama;
              if (prof.tanggal_masuk) realTglMasuk = prof.tanggal_masuk;
            }
          }

          if (!realName) {
            const prof = profilesList.find(
              (p) =>
                cleanHouseNo(p.nomor_rumah || '') === targetClean ||
                (p.rumah && cleanHouseNo(p.rumah.nomor_rumah || '') === targetClean)
            );
            if (prof) {
              if (prof.nama && prof.nama !== 'Belum ada nama') realName = prof.nama;
              if (prof.tanggal_masuk) realTglMasuk = prof.tanggal_masuk;
            }
          }
        }
      } catch (e) {}

      if (!realName && userLabel && !userLabel.startsWith('Warga (') && !userLabel.startsWith('Penghuni ')) {
        realName = userLabel;
      }

      setNamaWarga((prev) => prev === 'Warga' ? (realName || `Penghuni ${houseNo}`) : prev);
      if (realTglMasuk) setTanggalMasuk((prev) => prev || realTglMasuk);
    } catch (e) {
      addDebug(`❌ localStorage iuran fallback error: ${e}`);
    }

    // ─── STEP 6: Load Events to get Tanggal Event ───
    const client = createClient();
    if (client) {
      client.from('events').select('id, tanggal_event').then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((e: any) => {
            map[e.id] = e.tanggal_event;
          });
          setEventMap(map);
        }
      });
    }

    // ─── Event Listeners for config sync ───
    const handleConfigEvent = (e: any) => {
      if (e.detail) {
        setConfig(e.detail);
        addDebug(`🔔 Config updated via CustomEvent: Rp ${e.detail.nominal_per_bulan?.toLocaleString('id-ID')}/bln`);
      }
    };
    const handleStorageEvent = () => {
      const cfg = getIuranConfigFromStorage();
      setConfig(cfg);
      addDebug(`🔔 Config updated via storage event: Rp ${cfg.nominal_per_bulan.toLocaleString('id-ID')}/bln`);
    };
    const handleFocusEvent = () => {
      const cfg = getIuranConfigFromStorage();
      setConfig(cfg);
      // Also reload kupons on focus
      const freshKupons = getKuponsForWarga(houseNo);
      if (freshKupons.length > 0) {
        setKupons(freshKupons);
      }
    };

    window.addEventListener('martinez_config_updated', handleConfigEvent);
    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('focus', handleFocusEvent);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('martinez_config_channel');
      bc.onmessage = (msg) => {
        if (msg.data) {
          setConfig(msg.data);
          addDebug(`🔔 Config updated via BroadcastChannel: Rp ${msg.data.nominal_per_bulan?.toLocaleString('id-ID')}/bln`);
        }
      };
    } catch (e) {}

    return () => {
      window.removeEventListener('martinez_config_updated', handleConfigEvent);
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('focus', handleFocusEvent);
      if (bc) bc.close();
    };
  }, [tahun, nomorRumah]);

  // Real-Time Kupon Synchronization Listener
  useEffect(() => {
    const syncKupons = () => {
      let targetHouse = nomorRumah;
      if (!targetHouse) {
        try {
          const stored = sessionStorage.getItem('demo_user');
          if (stored) {
            const user = JSON.parse(stored);
            targetHouse = user.nomor || '';
          }
        } catch (e) {}
      }

      if (targetHouse) {
        const freshKupons = getKuponsForWarga(targetHouse);
        setKupons((prev) => {
          // Merge: keep cloud kupons that aren't in local
          const mergedMap = new Map<string, KuponAcara>();
          prev.forEach((k) => mergedMap.set(k.id, k));
          freshKupons.forEach((k) => mergedMap.set(k.id, k));
          return Array.from(mergedMap.values());
        });
      }
    };

    syncKupons();

    window.addEventListener('focus', syncKupons);
    window.addEventListener('storage', syncKupons);
    const interval = setInterval(syncKupons, 3000);

    return () => {
      window.removeEventListener('focus', syncKupons);
      window.removeEventListener('storage', syncKupons);
      clearInterval(interval);
    };
  }, [nomorRumah]);

  // Metric Computations based on normalized iuranData
  const totalLunasCount = useMemo(() => {
    let count = 0;
    for (let m = 1; m <= 12; m++) {
      if (iuranData[m] === 'lunas') count++;
    }
    return count;
  }, [iuranData]);

  const totalBelumCount = useMemo(() => {
    return 12 - totalLunasCount;
  }, [totalLunasCount]);

  const isCurrentMonthLunas = useMemo(
    () => iuranData[currentMonthNum] === 'lunas',
    [iuranData, currentMonthNum]
  );

  const cleanNamaWarga = useMemo(() => {
    if (!namaWarga || namaWarga === 'Warga' || namaWarga.startsWith('Warga (')) {
      return `Penghuni ${nomorRumah}`;
    }
    return namaWarga;
  }, [namaWarga, nomorRumah]);

  const formattedTanggalMasuk = useMemo(() => {
    if (!tanggalMasuk) return '';
    try {
      const d = new Date(tanggalMasuk);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      }
    } catch (e) {}
    return tanggalMasuk;
  }, [tanggalMasuk]);

  const nominalTerbayarTotal = totalLunasCount * config.nominal_per_bulan;
  const nominalTunggakanTotal = totalBelumCount * config.nominal_per_bulan;

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 3 }, (_, i) => current - 1 + i);
  }, []);

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('demo_user');
    document.cookie = 'demo_user=; path=/; max-age=0';
    window.location.href = '/login';
  };

  const handleCopyRekening = () => {
    navigator.clipboard.writeText(config.no_rekening);
    setCopiedRekening(true);
    setTimeout(() => setCopiedRekening(false), 2000);
  };

  const handleCopyBerita = () => {
    const beritaText = `Iuran Januari - Desember ${tahun} - Kluster Martinez ${nomorRumah}`;
    navigator.clipboard.writeText(beritaText);
    setCopiedBerita(true);
    setTimeout(() => setCopiedBerita(false), 2000);
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 pb-12">
      {/* ── Header ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl border-b border-surface-200 dark:border-surface-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.jpg"
              alt="Martinez Logo"
              className="w-9 h-9 rounded-xl object-contain bg-white p-1 shadow-md border border-surface-200 dark:border-surface-700"
            />
            <div>
              <h1 className="text-sm font-bold tracking-tight text-surface-900 dark:text-white">
                Cluster Martinez
              </h1>
              <p className="text-[11px] text-surface-700/50 dark:text-surface-200/40">
                Portal Warga — {cleanNamaWarga} ({nomorRumah})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-surface-700 dark:text-surface-200 hidden sm:block">
              {cleanNamaWarga} ({nomorRumah})
            </span>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-colors cursor-pointer"
              title="Keluar Portal Warga"
            >
              <LogOut className="w-4 h-4 text-surface-500" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* ── SECTION 1: RESIDENT WELCOME BANNER ──────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-accent-600 p-6 text-white shadow-xl shadow-primary-500/20 animate-fade-in">
          <div className="absolute -top-12 -right-12 w-44 h-44 bg-white/5 rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-white/5 rounded-full" />

          <div className="relative">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md">
                  <Home className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-bold tracking-tight">
                      {cleanNamaWarga}
                    </p>
                    <span className="px-2.5 py-0.5 bg-white/20 text-white rounded-full text-xs font-semibold uppercase">
                      RT {rt}
                    </span>
                  </div>
                  <p className="text-xs text-white/80 mt-0.5 font-mono">
                    No. Rumah: <span className="font-bold">{nomorRumah}</span> • Status: <span className="capitalize font-bold">{statusHunian}</span>
                    {formattedTanggalMasuk && (
                      <span> • Sejak: <span className="font-bold">{formattedTanggalMasuk}</span></span>
                    )}
                  </p>
                </div>
              </div>

              {/* Status Lunas Bulan Ini Badge */}
              <div
                className={`px-3.5 py-1.5 rounded-2xl flex items-center gap-2 text-xs font-bold shadow-lg ${
                  isCurrentMonthLunas
                    ? 'bg-success-500 text-white'
                    : 'bg-danger-500 text-white'
                }`}
              >
                {isCurrentMonthLunas ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    Lunas {currentMonthName}
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 stroke-[3]" />
                    Belum Lunas {currentMonthName}
                  </>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-white/90">
              <span>Tarif Iuran: <strong>{formatRupiah(nominalTahunan)} / tahun</strong> ({formatRupiah(config.nominal_per_bulan)} / bulan)</span>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl transition-all cursor-pointer shadow-sm"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Tata Cara Pembayaran Transfer
              </button>
            </div>
          </div>
        </div>

        {/* ── SECTION 2: METRIC CARDS DATA IURAN WARGA ────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-surface-900 dark:text-white">
                Metrik Iuran Rumah Saya
              </h2>
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-surface-400" />
              <div className="relative">
                <select
                  value={tahun}
                  onChange={(e) => setTahun(Number(e.target.value))}
                  className="appearance-none pl-3 pr-8 py-1.5 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 cursor-pointer text-surface-900 dark:text-white"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      Tahun {y}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card 1: Total Terbayar */}
            <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-surface-500">
                  Total Terbayar ({tahun})
                </span>
                <div className="w-8 h-8 rounded-xl bg-success-500/10 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-success-500" />
                </div>
              </div>
              <p className="text-xl font-bold font-mono text-success-600 dark:text-success-400">
                {formatRupiah(nominalTerbayarTotal)}
              </p>
              <p className="text-xs text-surface-500 mt-1 font-medium">
                {totalLunasCount} dari 12 bulan lunas
              </p>
            </div>

            {/* Card 2: Sisa Tunggakan */}
            <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-surface-500">
                  Sisa Tunggakan ({tahun})
                </span>
                <div className="w-8 h-8 rounded-xl bg-danger-500/10 flex items-center justify-center">
                  <Coins className="w-4 h-4 text-danger-500" />
                </div>
              </div>
              <p className="text-xl font-bold font-mono text-danger-600 dark:text-danger-400">
                {formatRupiah(nominalTunggakanTotal)}
              </p>
              <p className="text-xs text-surface-500 mt-1 font-medium">
                {totalBelumCount} bulan belum terbayar
              </p>
            </div>
          </div>
        </div>

        {/* ── SECTION 3: TABEL MATRIKS HISTORI IURAN RUMAH SAYA ──── */}
        <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden animate-fade-in">
          <div className="px-5 py-4 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary-500" />
              <h2 className="font-bold text-surface-900 dark:text-white text-sm">
                Histori Pembayaran Iuran Bulan (12 Bulan)
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-primary-600 dark:text-primary-400">
              {totalLunasCount}/12 Bulan Lunas
            </span>
          </div>

          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 stagger-children">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const status = iuranData[m];
              const isLunas = status === 'lunas';

              return (
                <div
                  key={m}
                  className={`
                    flex items-center gap-3 p-3.5 rounded-2xl border transition-all
                    ${
                      isLunas
                        ? 'bg-success-500/5 border-success-500/20'
                        : 'bg-danger-500/5 border-danger-500/10'
                    }
                  `}
                >
                  <div
                    className={`
                      flex items-center justify-center w-8 h-8 rounded-xl flex-shrink-0
                      ${
                        isLunas
                          ? 'bg-success-500/15 text-success-600 dark:text-success-400'
                          : 'bg-danger-500/10 text-danger-500'
                      }
                    `}
                  >
                    {isLunas ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <X className="w-4 h-4 stroke-[3]" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-surface-900 dark:text-white">
                      {BULAN_FULL[m]}
                    </p>
                    <p
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isLunas
                          ? 'text-success-600 dark:text-success-400'
                          : 'text-danger-500'
                      }`}
                    >
                      {isLunas ? 'LUNAS' : 'BELUM LUNAS'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── SECTION 4: KUPON ACARA KUSTER ────────────────────── */}
        <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden animate-fade-in">
          <div className="px-5 py-4 border-b border-surface-200 dark:border-surface-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-accent-500" />
                <h2 className="font-bold text-surface-900 dark:text-white text-sm">
                  Kupon Acara Warga
                </h2>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-accent-500/10 rounded-full">
                <Sparkles className="w-3 h-3 text-accent-500" />
                <span className="text-xs font-bold text-accent-600 dark:text-accent-400">
                  {kupons.length} Kupon
                </span>
              </div>
            </div>
            <p className="text-xs text-surface-500 mt-1">
              Klik kupon untuk me-render QR Code penukaran saat acara doorprize kluster.
            </p>
          </div>

          <div className="p-4">
            {kupons.length === 0 ? (
              <div className="text-center py-8 text-surface-500">
                <Ticket className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold">Belum Ada Kupon Acara</p>
                <p className="text-xs mt-1">Lunasi iuran bulanan untuk klaim kupon acara kluster.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 stagger-children">
                {kupons.map((kupon, idx) => (
                  <button
                    key={kupon.id}
                    onClick={() => setSelectedKupon(kupon)}
                    className={`
                      relative p-4 rounded-2xl border text-center transition-all cursor-pointer overflow-hidden
                      hover:shadow-md hover:-translate-y-0.5
                      ${
                        kupon.is_used
                          ? 'bg-surface-200/80 dark:bg-surface-800/80 border-surface-300 dark:border-surface-700 opacity-70 grayscale'
                          : 'bg-gradient-to-br from-accent-500/5 to-primary-500/5 border-accent-500/20 hover:border-accent-500/40'
                      }
                    `}
                  >
                    <QrCode
                      className={`w-8 h-8 mx-auto mb-2 ${
                        kupon.is_used ? 'text-surface-400' : 'text-accent-500'
                      }`}
                    />
                    <p className="text-[11px] font-bold text-surface-900 dark:text-white truncate">
                      {kupon.kategori_nama || kupon.nama_kupon || `KUPON #${idx + 1}`}
                    </p>
                    <p className="text-[9px] font-mono text-surface-500 truncate">
                      {kupon.kode_kupon}
                    </p>
                    {kupon.is_used ? (
                      <div className="mt-2">
                        <span className="inline-block px-2 py-0.5 bg-danger-500/10 text-danger-600 dark:text-danger-400 border border-danger-500/20 rounded-full text-[9px] font-bold uppercase">
                          🔴 SUDAH DIGUNAKAN
                        </span>
                        {kupon.used_by_booth_nama && (
                          <p className="text-[9px] text-surface-500 mt-0.5 font-medium truncate">
                            {kupon.used_by_booth_nama}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2">
                        <span className="inline-block px-2 py-0.5 bg-success-500/10 text-success-600 dark:text-success-400 border border-success-500/20 rounded-full text-[9px] font-bold uppercase">
                          🟢 BELUM DIGUNAKAN
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── MODAL CARA BAYAR / TRANSFER REKENING ───────────────── */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowPaymentModal(false)}
          />
          <div className="relative w-full max-w-2xl bg-white dark:bg-surface-900 rounded-3xl shadow-2xl border border-surface-200 dark:border-surface-800 animate-fade-in overflow-hidden max-h-[90vh] flex flex-col">
            <div className="h-1.5 bg-gradient-to-r from-primary-500 to-accent-500 flex-shrink-0" />
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-primary-500/10 text-primary-500">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-surface-900 dark:text-white">
                    Tata Cara Pembayaran Iuran Resmi
                  </h3>
                  <p className="text-xs text-surface-500">
                    Pengurus & Bendahara RW 037 / RT 01-05
                  </p>
                </div>
              </div>

              <div className="text-xs text-surface-700 dark:text-surface-300 leading-relaxed space-y-3 bg-surface-50 dark:bg-surface-800/50 p-4 rounded-2xl border border-surface-200 dark:border-surface-700">
                <p>
                  Kami selaku Pengurus mengucapkan Terima Kasih bagi warga yang sudah ikut berpartisipasi iuran warga selama ini. Sampai berjumpa di Event Selanjutnya.
                </p>
                <p>
                  Iuran warga th {tahun} yaitu <strong>{formatRupiah(nominalTahunan)}/tahun</strong> ({formatRupiah(config.nominal_per_bulan)}/bulan) dan kami juga tetap membuka kesempatan bapak/ibu/Koko/Cici yang belum berpartisipasi dalam iuran warga martinez bisa transfer ke rekening berikut :
                </p>
              </div>

              <p className="text-xs font-bold text-surface-900 dark:text-white pt-1">
                Contoh rincian transfer bank tujuan (Silakan pilih Opsi Pembayaran Bulanan atau Tahunan):
              </p>

              {/* 2-Column Payment Options Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Opsi 1: Pembayaran Bulanan */}
                <div className="p-4 bg-gradient-to-br from-primary-500/10 to-primary-500/5 rounded-2xl border border-primary-500/20 space-y-2 text-xs flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-primary-500/20">
                      <span className="font-bold text-primary-600 dark:text-primary-400 text-xs">
                        📅 OPSI 1: BAYAR BULANAN
                      </span>
                      <span className="px-2 py-0.5 bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold rounded text-[9px]">
                        Eceran
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-surface-500">Bank Tujuan:</span>
                      <span className="font-bold text-surface-900 dark:text-white">{config.nama_bank}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-surface-500">No. Rekening:</span>
                      <div className="flex items-center gap-1.5 font-mono font-bold text-primary-600 dark:text-primary-400 text-xs">
                        <span>{config.no_rekening}</span>
                        <button
                          onClick={handleCopyRekening}
                          className="px-1.5 py-0.5 bg-primary-500/20 hover:bg-primary-500/30 rounded text-[9px] text-primary-600 dark:text-primary-300 transition-colors cursor-pointer"
                        >
                          {copiedRekening ? 'Tersalin!' : 'Salin'}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-surface-500">Atas Nama:</span>
                      <span className="font-bold text-surface-900 dark:text-white">{config.atas_nama}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-surface-200 dark:border-surface-700">
                      <span className="text-surface-500">Nominal Per Bulan:</span>
                      <span className="font-bold font-mono text-primary-600 dark:text-primary-400">{formatRupiah(config.nominal_per_bulan)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-surface-200 dark:border-surface-700 mt-2">
                    <span className="text-surface-500 block mb-1">Berita Transfer:</span>
                    <code className="font-mono font-bold text-surface-900 dark:text-white bg-white dark:bg-surface-900 px-2 py-1 rounded block text-center text-[11px] truncate">
                      Iuran {currentMonthName} {tahun} - {nomorRumah}
                    </code>
                  </div>
                </div>

                {/* Opsi 2: Pembayaran Tahunan (Full 1 Tahun) */}
                <div className="p-4 bg-gradient-to-br from-success-500/10 to-accent-500/10 rounded-2xl border border-success-500/20 space-y-2 text-xs flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-success-500/20">
                      <span className="font-bold text-success-600 dark:text-success-400 text-xs">
                        🏆 OPSI 2: BAYAR TAHUNAN
                      </span>
                      <span className="px-2 py-0.5 bg-success-500/10 text-success-600 dark:text-success-400 font-bold rounded text-[9px]">
                        Full 1 Tahun
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-surface-500">Bank Tujuan:</span>
                      <span className="font-bold text-surface-900 dark:text-white">{config.nama_bank}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-surface-500">No. Rekening:</span>
                      <div className="flex items-center gap-1.5 font-mono font-bold text-primary-600 dark:text-primary-400 text-xs">
                        <span>{config.no_rekening}</span>
                        <button
                          onClick={handleCopyRekening}
                          className="px-1.5 py-0.5 bg-primary-500/20 hover:bg-primary-500/30 rounded text-[9px] text-primary-600 dark:text-primary-300 transition-colors cursor-pointer"
                        >
                          {copiedRekening ? 'Tersalin!' : 'Salin'}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-surface-500">Atas Nama:</span>
                      <span className="font-bold text-surface-900 dark:text-white">{config.atas_nama}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-surface-200 dark:border-surface-700">
                      <span className="text-surface-500">Nominal Tahunan:</span>
                      <span className="font-bold font-mono text-success-600 dark:text-success-400">{formatRupiah(nominalTahunan)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-surface-200 dark:border-surface-700 mt-2">
                    <span className="text-surface-500 block mb-1">Berita Transfer:</span>
                    <code className="font-mono font-bold text-surface-900 dark:text-white bg-white dark:bg-surface-900 px-2 py-1 rounded block text-center text-[11px] truncate">
                      Iuran Jan - Des {tahun} - {nomorRumah}
                    </code>
                  </div>
                </div>
              </div>

              <div className="text-xs text-surface-500 italic">
                Salam,<br />
                <strong>Bendahara RW 037</strong><br />
                Ketua RW 037 / {config.rt_info}
              </div>

              <button
                onClick={() => setShowPaymentModal(false)}
                className="w-full py-2.5 bg-surface-900 dark:bg-surface-100 text-white dark:text-surface-900 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL QR CODE KUPON ───────────────────────────────── */}
      {selectedKupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedKupon(null)}
          />
          <div className="relative w-full max-w-sm bg-white dark:bg-surface-900 rounded-3xl shadow-2xl border border-surface-200 dark:border-surface-800 animate-fade-in overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-accent-500 via-primary-500 to-accent-500" />
            <div className="p-6 text-center">
              <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-1">
                {selectedKupon.kategori_nama || selectedKupon.nama_kupon || 'Kupon Acara Doorprize'}
              </h3>
              
              <div className="mb-4">
                 <p className="font-semibold text-primary-600 dark:text-primary-400 text-sm">Event: {selectedKupon.nama_event || '-'}</p>
                 <p className="text-xs text-surface-500 font-medium">Tanggal: {eventMap[selectedKupon.event_id] || '-'}</p>
              </div>

              <p className="text-xs text-surface-500 mb-6">
                {selectedKupon.is_used
                  ? 'Kupon ini telah digunakan (diredeem)'
                  : 'Tunjukkan QR code ini kepada Panitia / Booth Acara Kluster'}
              </p>

              <div className="relative inline-flex p-4 bg-white rounded-2xl shadow-inner mb-4 overflow-hidden">
                <QRCodeSVG
                  value={selectedKupon.kode_kupon}
                  size={200}
                  level="H"
                  bgColor="#ffffff"
                  fgColor={selectedKupon.is_used ? "#94a3b8" : "#0f172a"}
                  includeMargin={false}
                />
                {selectedKupon.is_used && (
                  <div className="absolute inset-0 bg-surface-950/85 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center text-white p-4">
                    <XCircle className="w-12 h-12 text-danger-500 mb-2 animate-bounce" />
                    <span className="font-extrabold text-sm text-danger-400 uppercase tracking-wider">
                      SUDAH DIGUNAKAN
                    </span>
                    <span className="text-[11px] font-bold text-surface-200 mt-1">
                      Kupon Telah Diredeem
                    </span>
                    {selectedKupon.used_by_booth_nama && (
                      <span className="text-[10px] text-surface-400 mt-1 font-mono">
                        di {selectedKupon.used_by_booth_nama}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-surface-50 dark:bg-surface-800 rounded-xl p-3 mb-4">
                <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-1">
                  Kode QR Kupon
                </p>
                <p className="text-sm font-mono font-bold text-surface-900 dark:text-white">
                  {selectedKupon.kode_kupon}
                </p>
              </div>

              <button
                onClick={() => setSelectedKupon(null)}
                className="w-full py-2.5 text-xs font-bold text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DEBUG SYNC PANEL ─────────────────────────────────── */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="px-3 py-1.5 bg-surface-900 text-white text-[10px] font-mono font-bold rounded-lg shadow-lg hover:bg-surface-800 transition-colors cursor-pointer opacity-50 hover:opacity-100"
        >
          {showDebug ? '✕ Tutup Debug' : '🔧 Sync Debug'}
        </button>
        {showDebug && (
          <div className="absolute bottom-10 right-0 w-[420px] max-h-[300px] bg-surface-950 text-green-400 text-[10px] font-mono rounded-xl border border-surface-700 shadow-2xl overflow-hidden">
            <div className="px-3 py-2 bg-surface-900 text-white font-bold text-[11px] flex items-center justify-between border-b border-surface-700">
              <span>📡 Sync Debug Log — {nomorRumah}</span>
              <span className="text-[9px] text-surface-400">
                Config: Rp {config.nominal_per_bulan.toLocaleString('id-ID')}/bln | Kupons: {kupons.length}
              </span>
            </div>
            <div className="p-2 overflow-y-auto max-h-[250px] space-y-0.5">
              {debugLines.length === 0 ? (
                <p className="text-surface-500">Belum ada log...</p>
              ) : (
                debugLines.map((line, i) => (
                  <p key={i} className={`leading-tight ${line.includes('❌') ? 'text-red-400' : line.includes('⚠️') ? 'text-yellow-400' : line.includes('✅') || line.includes('☁️') ? 'text-green-400' : 'text-surface-400'}`}>
                    {line}
                  </p>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
