'use client';

// ============================================================
// Admin Dashboard Overview Page — /admin/dashboard
// Executive summary metrics with Rupiah Nominal & House Count context
// Super App Cluster Martinez
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Home,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  MapPin,
  ChevronRight,
  ShieldCheck,
  CalendarDays,
  ChevronDown,
  Sparkles,
  Wallet,
  Coins,
} from 'lucide-react';
import type { IuranMatrixRow, Rumah, UserRole } from '@/types';
import { BULAN_FULL } from '@/types';
import { getMockIuranMatrix } from '@/lib/mock-data';
import { getIuranConfigFromStorage, DEFAULT_IURAN_CONFIG, type IuranConfig } from '@/lib/config-store';
import { fetchIuranMatrixFromCloud, fetchProfilesFromCloud } from '@/lib/db-sync';

const STORAGE_KEY_IURAN = 'martinez_iuran_matrix_v2';
const STORAGE_KEY_RUMAH = 'martinez_rumah_list_v3';

export default function AdminDashboardOverviewPage() {
  const router = useRouter();
  const [selectedTahun, setSelectedTahun] = useState(new Date().getFullYear());
  const [userRole, setUserRole] = useState<UserRole>('superadmin');
  const [userName, setUserName] = useState('Admin');
  const [iuranConfig, setIuranConfig] = useState<IuranConfig>(DEFAULT_IURAN_CONFIG);
  const [iuranMatrix, setIuranMatrix] = useState<IuranMatrixRow[]>([]);
  const [rumahList, setRumahList] = useState<Rumah[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const currentMonthNum = new Date().getMonth() + 1; // 1-12
  const currentMonthName = BULAN_FULL[currentMonthNum] || 'Bulan Ini';

  useEffect(() => {
    const stored = sessionStorage.getItem('demo_user');
    if (stored) {
      const u = JSON.parse(stored);
      setUserRole(u.role);
      setUserName(u.label);
    }

    setIuranConfig(getIuranConfigFromStorage());

    try {
      const savedIuran = localStorage.getItem(STORAGE_KEY_IURAN);
      const savedRumah = localStorage.getItem(STORAGE_KEY_RUMAH);

      let rList: Rumah[] = [];
      if (savedRumah) {
        rList = JSON.parse(savedRumah);
        setRumahList(rList);
      }

      if (savedIuran) {
        setIuranMatrix(JSON.parse(savedIuran));
      } else {
        const defaultMatrix = getMockIuranMatrix(selectedTahun);
        setIuranMatrix(defaultMatrix);
      }
    } catch (e) {
      console.error(e);
      setIuranMatrix(getMockIuranMatrix(selectedTahun));
    }
    
    // Background cloud sync
    Promise.all([fetchIuranMatrixFromCloud(), fetchProfilesFromCloud()]).then(([iuranRes, profilesRes]) => {
      if (iuranRes) setIuranMatrix(iuranRes);
      if (profilesRes) setRumahList(profilesRes.rumahList);
    });

    setIsLoaded(true);
  }, [selectedTahun]);

  // Format currency helper (Rp 280.000.000)
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // ── Overall Cluster Metrics (Data Keseluruhan) ─────────────
  const overallStats = useMemo(() => {
    const totalHouses = iuranMatrix.length;
    let lunasCurrentMonthCount = 0;

    let totalLunasSlots = 0;
    let totalBelumSlots = 0;

    let pemilikCount = 0;
    let penyewaCount = 0;

    iuranMatrix.forEach((row) => {
      if (row.status_hunian === 'penyewa') penyewaCount++;
      else pemilikCount++;

      // Check current month lunas
      if (row.bulan[currentMonthNum] === 'lunas') {
        lunasCurrentMonthCount++;
      }

      for (let m = 1; m <= 12; m++) {
        if (row.bulan[m] === 'lunas') totalLunasSlots++;
        else totalBelumSlots++;
      }
    });

    const currentMonthLunasPercentage =
      totalHouses > 0 ? Math.round((lunasCurrentMonthCount / totalHouses) * 100) : 0;

    const nominalLunasTotal = totalLunasSlots * iuranConfig.nominal_per_bulan;
    const nominalBelumTotal = totalBelumSlots * iuranConfig.nominal_per_bulan;

    return {
      totalHouses,
      pemilikCount,
      penyewaCount,
      lunasCurrentMonthCount,
      belumCurrentMonthCount: totalHouses - lunasCurrentMonthCount,
      currentMonthLunasPercentage,
      totalLunasSlots,
      totalBelumSlots,
      nominalLunasTotal,
      nominalBelumTotal,
    };
  }, [iuranMatrix, currentMonthNum]);

  // ── Data Per RT Breakdown ──────────────────────────────────
  const rtBreakdown = useMemo(() => {
    const rtMap: Record<
      string,
      {
        rt: string;
        houseCount: number;
        pemilikCount: number;
        penyewaCount: number;
        lunasCurrentMonth: number;
        lunasSlotsTotal: number;
        belumSlotsTotal: number;
      }
    > = {};

    iuranMatrix.forEach((row) => {
      const rt = row.rt || '01';
      if (!rtMap[rt]) {
        rtMap[rt] = {
          rt,
          houseCount: 0,
          pemilikCount: 0,
          penyewaCount: 0,
          lunasCurrentMonth: 0,
          lunasSlotsTotal: 0,
          belumSlotsTotal: 0,
        };
      }

      rtMap[rt].houseCount++;
      if (row.status_hunian === 'penyewa') rtMap[rt].penyewaCount++;
      else rtMap[rt].pemilikCount++;

      if (row.bulan[currentMonthNum] === 'lunas') {
        rtMap[rt].lunasCurrentMonth++;
      }

      for (let m = 1; m <= 12; m++) {
        if (row.bulan[m] === 'lunas') rtMap[rt].lunasSlotsTotal++;
        else rtMap[rt].belumSlotsTotal++;
      }
    });

    return Object.values(rtMap).sort((a, b) => a.rt.localeCompare(b.rt));
  }, [iuranMatrix, currentMonthNum]);

  return (
    <div className="space-y-8 max-w-[1350px] mx-auto animate-fade-in">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 shadow-lg shadow-primary-500/20">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl lg:text-2xl font-bold text-surface-900 dark:text-white">
                Dashboard Eksekutif
              </h1>
              <span className="px-2.5 py-0.5 bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-full text-xs font-bold">
                {currentMonthName} {selectedTahun}
              </span>
            </div>
            <p className="text-sm text-surface-700/60 dark:text-surface-200/50 mt-0.5">
              Metrik nominal tertagih & tingkat kepatuhan warga per wilayah RT
            </p>
          </div>
        </div>

        {/* Year Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-surface-700 dark:text-surface-200/70">
            <CalendarDays className="w-4 h-4 text-primary-500" />
            <span>Tahun Periode</span>
          </div>
          <div className="relative">
            <select
              value={selectedTahun}
              onChange={(e) => setSelectedTahun(Number(e.target.value))}
              className="appearance-none pl-4 pr-10 py-2.5 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all cursor-pointer text-surface-900 dark:text-white"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-200/50 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── SECTION 1: DATA KESELURUHAN (OVERALL CLUSTER METRICS) ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-primary-500" />
          <h2 className="text-base font-bold text-surface-900 dark:text-white uppercase tracking-wider text-xs">
            Data Keseluruhan Kluster ({currentMonthName} {selectedTahun})
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Rumah */}
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-surface-700/50 dark:text-surface-200/40">
                Total Rumah
              </span>
              <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center">
                <Home className="w-4 h-4 text-primary-500" />
              </div>
            </div>
            <p className="text-3xl font-bold text-surface-900 dark:text-white font-mono">
              {overallStats.totalHouses} <span className="text-sm font-normal text-surface-400">Unit</span>
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs text-surface-500">
              <span className="px-2 py-0.5 bg-primary-500/10 text-primary-600 dark:text-primary-400 font-semibold rounded">
                {overallStats.pemilikCount} Pemilik
              </span>
              <span className="px-2 py-0.5 bg-accent-500/10 text-accent-600 dark:text-accent-400 font-semibold rounded">
                {overallStats.penyewaCount} Penyewa
              </span>
            </div>
          </div>

          {/* Nominal Iuran Tertagih */}
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-surface-700/50 dark:text-surface-200/40">
                Total Dana Tertagih
              </span>
              <div className="w-9 h-9 rounded-xl bg-success-500/10 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-success-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-success-600 dark:text-success-400 font-mono tracking-tight">
              {formatRupiah(overallStats.nominalLunasTotal)}
            </p>
            <p className="text-xs text-surface-500 mt-2 font-medium">
              {overallStats.totalLunasSlots} bulan/unit terbayar lunas
            </p>
          </div>

          {/* Status Lunas Bulan Ini */}
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-surface-700/50 dark:text-surface-200/40">
                Lunas {currentMonthName}
              </span>
              <div className="w-9 h-9 rounded-xl bg-success-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-success-500" />
              </div>
            </div>
            <p className="text-3xl font-bold text-surface-900 dark:text-white font-mono">
              {overallStats.lunasCurrentMonthCount}{' '}
              <span className="text-sm font-normal text-surface-400">/ {overallStats.totalHouses} Rumah</span>
            </p>
            <p className="text-xs text-success-600 dark:text-success-400 font-semibold mt-2 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-success-500" />
              {overallStats.currentMonthLunasPercentage}% Rumah Lunas Bulan Ini
            </p>
          </div>

          {/* Sisa Tunggakan (Nominal) */}
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-surface-700/50 dark:text-surface-200/40">
                Sisa Tunggakan (Belum)
              </span>
              <div className="w-9 h-9 rounded-xl bg-danger-500/10 flex items-center justify-center">
                <Coins className="w-4 h-4 text-danger-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-danger-600 dark:text-danger-400 font-mono tracking-tight">
              {formatRupiah(overallStats.nominalBelumTotal)}
            </p>
            <p className="text-xs text-surface-500 mt-2 font-medium">
              {overallStats.totalBelumSlots} bulan/unit belum diverifikasi
            </p>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: DATA PER RT BREAKDOWN (METRIC CARDS PER RT) ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent-500" />
            <h2 className="text-base font-bold text-surface-900 dark:text-white uppercase tracking-wider text-xs">
              Analisa Tertagih Data Per RT ({rtBreakdown.length} RT)
            </h2>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            Buka Tabel Data Iuran Lengkap
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {rtBreakdown.length === 0 ? (
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-8 text-center text-surface-500 text-sm">
            Belum ada data unit rumah terdaftar untuk menampilkan breakdown per RT.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rtBreakdown.map((item) => {
              const lunasRateMonth =
                item.houseCount > 0
                  ? Math.round((item.lunasCurrentMonth / item.houseCount) * 100)
                  : 0;

              const nominalRtTertagih = item.lunasSlotsTotal * iuranConfig.nominal_per_bulan;

              // Health Status Badge
              let statusLabel = 'Sangat Baik';
              let statusStyle = 'bg-success-500/10 text-success-600 border-success-500/20';
              if (lunasRateMonth < 60) {
                statusLabel = 'Perlu Perhatian';
                statusStyle = 'bg-danger-500/10 text-danger-500 border-danger-500/20';
              } else if (lunasRateMonth < 85) {
                statusLabel = 'Cukup Baik';
                statusStyle = 'bg-warning-500/10 text-warning-600 border-warning-500/20';
              }

              return (
                <div
                  key={item.rt}
                  className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* RT Card Header */}
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-surface-100 dark:border-surface-800">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-accent-500/10 text-accent-600 dark:text-accent-400 font-bold font-mono text-sm">
                          RT {item.rt}
                        </div>
                        <div>
                          <h3 className="font-bold text-surface-900 dark:text-white text-sm">
                            Wilayah RT {item.rt}
                          </h3>
                          <p className="text-[11px] text-surface-500">
                            {item.houseCount} Unit Rumah ({item.pemilikCount} Pemilik, {item.penyewaCount} Penyewa)
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusStyle}`}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    {/* Progress Bar & Percentage for Current Month */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                        <span className="text-surface-600 dark:text-surface-300">
                          Lunas {currentMonthName}
                        </span>
                        <span className="font-mono text-primary-600 dark:text-primary-400 font-bold text-sm">
                          {item.lunasCurrentMonth} / {item.houseCount} Rumah ({lunasRateMonth}%)
                        </span>
                      </div>
                      <div className="w-full bg-surface-100 dark:bg-surface-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            lunasRateMonth >= 85
                              ? 'bg-success-500'
                              : lunasRateMonth >= 60
                                ? 'bg-warning-500'
                                : 'bg-danger-500'
                          }`}
                          style={{ width: `${lunasRateMonth}%` }}
                        />
                      </div>
                    </div>

                    {/* Detailed RT Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                      <div className="p-2.5 bg-success-500/5 border border-success-500/10 rounded-xl">
                        <span className="text-[11px] text-surface-500 block mb-0.5">
                          Dana Tertagih
                        </span>
                        <span className="font-bold font-mono text-success-600 dark:text-success-400 text-xs">
                          {formatRupiah(nominalRtTertagih)}
                        </span>
                      </div>

                      <div className="p-2.5 bg-danger-500/5 border border-danger-500/10 rounded-xl">
                        <span className="text-[11px] text-surface-500 block mb-0.5">
                          Sisa Tunggakan
                        </span>
                        <span className="font-bold font-mono text-danger-600 dark:text-danger-400 text-xs">
                          {item.belumSlotsTotal} bulan/unit
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <button
                    onClick={() => router.push(`/admin?rt=${item.rt}`)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-surface-50 dark:bg-surface-800 hover:bg-primary-500/10 hover:text-primary-600 dark:hover:text-primary-400 text-surface-600 dark:text-surface-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    Buka Matriks Data Iuran RT {item.rt}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
