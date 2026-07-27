'use client';

// ============================================================
// IuranTable — Monthly Payment Matrix Table
// Simple inline confirmation popover directly at clicked cell (with 3s countdown)
// Super App Cluster Martinez
// ============================================================

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Check,
  X,
  ChevronDown,
  CalendarDays,
  Home,
  MapPin,
  Building,
  Search,
} from 'lucide-react';
import type { IuranMatrixRow, UserRole, StatusIuran } from '@/types';
import { BULAN_LABELS } from '@/types';

interface IuranTableProps {
  data: IuranMatrixRow[];
  userRole: UserRole;
  onToggleIuran?: (
    rumahId: string,
    bulan: number,
    tahun: number,
    newStatus: StatusIuran
  ) => void;
}

interface ConfirmToggleTarget {
  rumahId: string;
  nomorRumah: string;
  rt?: string;
  bulan: number;
  tahun: number;
  currentStatus: StatusIuran;
  newStatus: StatusIuran;
}

// Status hunian badge styles
const HUNIAN_STYLES: Record<string, string> = {
  pemilik: 'bg-primary-500/10 text-primary-600 dark:text-primary-400',
  penyewa: 'bg-accent-500/10 text-accent-600 dark:text-accent-400',
  dihuni: 'bg-success-500/10 text-success-600 dark:text-success-400',
  kosong: 'bg-surface-200/50 text-surface-700 dark:bg-surface-800 dark:text-surface-200/50',
  disewakan: 'bg-warning-400/10 text-warning-500',
};

const HUNIAN_LABELS: Record<string, string> = {
  pemilik: 'Pemilik',
  penyewa: 'Penyewa',
  dihuni: 'Dihuni',
  kosong: 'Kosong',
  disewakan: 'Sewa',
};

const BLOCKS_LIST = [
  'MTNU1',
  'MTNU2',
  'MTNU3',
  'MTNR',
  'MTNS1',
  'MTNS2',
  'MTNS3',
  'MTNS5',
  'MTNS6',
];

export default function IuranTable({
  data,
  userRole,
  onToggleIuran,
}: IuranTableProps) {
  const searchParams = useSearchParams();
  const [selectedTahun, setSelectedTahun] = useState(new Date().getFullYear());
  const [selectedBlock, setSelectedBlock] = useState<string>('all');
  const [selectedRt, setSelectedRt] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Auto-set selected RT from URL parameter e.g. /admin?rt=02
  useEffect(() => {
    const rtParam = searchParams.get('rt');
    if (rtParam) {
      const formatted = rtParam.padStart(2, '0');
      setSelectedRt(formatted);
    }
  }, [searchParams]);

  // ── Inline Confirmation Popover State ──────────
  const [confirmTarget, setConfirmTarget] = useState<ConfirmToggleTarget | null>(null);
  const [countdown, setCountdown] = useState<number>(3);

  // Role Access: Superadmin and Bendahara CAN toggle/edit status
  const canToggle = userRole === 'superadmin' || userRole === 'bendahara';

  // ── 3 Second Countdown Timer Effect ────────────────────────
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (confirmTarget && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [confirmTarget, countdown]);

  // Generate year options
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => current - 2 + i);
  }, []);

  // Always display all 12 months (Jan - Des)
  const visibleMonths = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  }, []);

  // Extract unique RT options from data
  const rtOptions = useMemo(() => {
    const set = new Set<string>();
    data.forEach((r) => {
      if (r.rt) set.add(r.rt);
    });
    return Array.from(set).sort();
  }, [data]);

  // Filtered dataset by Block, RT, and Search
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const houseNo = row.nomor_rumah.toUpperCase();

      const matchBlock =
        selectedBlock === 'all' || houseNo.startsWith(selectedBlock);

      const matchRt = selectedRt === 'all' || row.rt === selectedRt;

      const matchSearch =
        !search ||
        houseNo.includes(search.toUpperCase()) ||
        (row.rt && row.rt.includes(search));

      return matchBlock && matchRt && matchSearch;
    });
  }, [data, selectedBlock, selectedRt, search]);

  // ── Open Inline Confirmation Popover on Cell Click ─────────
  const handleCellClick = (
    rumahId: string,
    nomorRumah: string,
    rt: string | undefined,
    bulan: number,
    currentStatus: StatusIuran
  ) => {
    if (!canToggle || !onToggleIuran) return;
    const newStatus: StatusIuran =
      currentStatus === 'lunas' ? 'belum_lunas' : 'lunas';

    // Toggle off if clicking the same cell again
    if (confirmTarget?.rumahId === rumahId && confirmTarget?.bulan === bulan) {
      setConfirmTarget(null);
      return;
    }

    setConfirmTarget({
      rumahId,
      nomorRumah,
      rt,
      bulan,
      tahun: selectedTahun,
      currentStatus,
      newStatus,
    });
    setCountdown(3);
  };

  // ── Execute Status Toggle after 3s Countdown ───────────────
  const handleConfirmToggle = () => {
    if (!confirmTarget || !onToggleIuran) return;

    onToggleIuran(
      confirmTarget.rumahId,
      confirmTarget.bulan,
      confirmTarget.tahun,
      confirmTarget.newStatus
    );

    setConfirmTarget(null);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Filter Bar Top: Year Selector ─────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Year Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-surface-700 dark:text-surface-200/70">
            <CalendarDays className="w-4 h-4 text-primary-500" />
            <span>Tahun Matrix</span>
          </div>
          <div className="relative">
            <select
              value={selectedTahun}
              onChange={(e) => setSelectedTahun(Number(e.target.value))}
              className="appearance-none pl-4 pr-10 py-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all cursor-pointer text-surface-900 dark:text-white"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-200/50 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── Block & RT Filter Bar ────────────────────────────── */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-4 shadow-sm space-y-3">
        {/* Block Filter Pills */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-surface-700/60 dark:text-surface-200/50 mb-2">
            <Building className="w-3.5 h-3.5 text-primary-500" />
            Filter Blok Kluster:
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedBlock('all')}
              className={`
                px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap
                ${
                  selectedBlock === 'all'
                    ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200'
                }
              `}
            >
              Semua Blok ({data.length})
            </button>
            {BLOCKS_LIST.map((block) => {
              const countInBlock = data.filter((r) =>
                r.nomor_rumah.toUpperCase().startsWith(block)
              ).length;
              return (
                <button
                  key={block}
                  onClick={() => setSelectedBlock(block)}
                  className={`
                    px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap
                    ${
                      selectedBlock === block
                        ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                        : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200'
                    }
                  `}
                >
                  {block} ({countInBlock})
                </button>
              );
            })}
          </div>
        </div>

        {/* RT Filter & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-surface-100 dark:border-surface-800">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
            <span className="text-xs font-semibold text-surface-700/60 dark:text-surface-200/50 flex items-center gap-1 mr-1">
              <MapPin className="w-3.5 h-3.5 text-accent-500" />
              RT:
            </span>
            <button
              onClick={() => setSelectedRt('all')}
              className={`
                px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap
                ${
                  selectedRt === 'all'
                    ? 'bg-accent-500 text-white shadow-sm'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200'
                }
              `}
            >
              Semua RT
            </button>
            {rtOptions.map((rt) => (
              <button
                key={rt}
                onClick={() => setSelectedRt(rt)}
                className={`
                  px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap
                  ${
                    selectedRt === rt
                      ? 'bg-accent-500 text-white shadow-sm'
                      : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200'
                  }
                `}
              >
                RT {rt}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari no. rumah..."
              className="w-full pl-9 pr-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
            />
          </div>
        </div>
      </div>

      {/* ── Table Matrix (All 12 Months Visible) ────────────────── */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-800/30">
                <th className="sticky left-0 z-20 bg-surface-100 dark:bg-surface-800 px-4 py-3.5 text-left font-semibold text-surface-700 dark:text-surface-200/70 min-w-[130px] border-r border-surface-200 dark:border-surface-700">
                  <div className="flex items-center gap-2">
                    <Home className="w-3.5 h-3.5 text-primary-500" />
                    No. Rumah
                  </div>
                </th>
                <th className="px-3 py-3.5 text-left font-semibold text-surface-700 dark:text-surface-200/70 min-w-[90px]">
                  Status
                </th>
                {visibleMonths.map((m) => (
                  <th
                    key={m}
                    className="px-2 py-3.5 text-center font-semibold text-surface-700 dark:text-surface-200/70 min-w-[70px]"
                  >
                    {BULAN_LABELS[m]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800/50">
              {filteredData.map((row, rowIdx) => {
                const isTopRow = rowIdx < 2; // Top 2 rows display popover BELOW to avoid header overlap

                return (
                  <tr
                    key={row.rumah_id}
                    className="hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors"
                  >
                    {/* Nomor Rumah & RT (sticky left column) */}
                    <td className="sticky left-0 z-10 bg-white dark:bg-surface-900 px-4 py-3 font-bold text-surface-900 dark:text-white whitespace-nowrap border-r border-surface-100 dark:border-surface-800">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-primary-600 dark:text-primary-400">
                          {row.nomor_rumah}
                        </span>
                        {row.rt && (
                          <span className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-800 rounded text-[10px] font-mono text-surface-500">
                            RT {row.rt}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status Hunian */}
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          HUNIAN_STYLES[row.status_hunian]
                        }`}
                      >
                        {HUNIAN_LABELS[row.status_hunian]}
                      </span>
                    </td>

                    {/* Monthly Status Cells */}
                    {visibleMonths.map((m) => {
                      const status = row.bulan[m];
                      const isLunas = status === 'lunas';
                      const isTarget =
                        confirmTarget?.rumahId === row.rumah_id &&
                        confirmTarget?.bulan === m;

                      return (
                        <td key={m} className="px-2 py-2.5 text-center relative">
                          {/* ── INLINE ADAPTIVE POPOVER PROMPT RIGHT AT CELL ── */}
                          {isTarget && (
                            <div
                              className={`absolute left-1/2 -translate-x-1/2 z-[60] w-44 bg-surface-900 text-white rounded-xl shadow-2xl p-2.5 text-center text-xs animate-fade-in border border-white/20 ${
                                isTopRow ? 'top-full mt-2' : 'bottom-full mb-2'
                              }`}
                            >
                              <div className="font-bold text-[11px]">
                                Ubah {BULAN_LABELS[m]} ke{' '}
                                <span
                                  className={
                                    confirmTarget.newStatus === 'lunas'
                                      ? 'text-success-400 font-extrabold'
                                      : 'text-danger-400 font-extrabold'
                                  }
                                >
                                  {confirmTarget.newStatus === 'lunas'
                                    ? 'LUNAS'
                                    : 'BELUM'}
                                </span>
                                ?
                              </div>

                              <div className="flex items-center justify-center gap-1.5 mt-2">
                                <button
                                  onClick={() => setConfirmTarget(null)}
                                  className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md text-[10px] text-surface-200 font-medium cursor-pointer"
                                >
                                  Batal
                                </button>

                                <button
                                  onClick={handleConfirmToggle}
                                  disabled={countdown > 0}
                                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                    countdown > 0
                                      ? 'bg-surface-800 text-surface-400 cursor-not-allowed'
                                      : 'bg-primary-500 hover:bg-primary-400 text-white shadow-md active:scale-95'
                                  }`}
                                >
                                  {countdown > 0 ? `Ya (${countdown}s)` : 'Ya, Ubah'}
                                </button>
                              </div>

                              {/* Arrow pointer: UPWARD arrow if top row, DOWNWARD arrow if lower row */}
                              {isTopRow ? (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-surface-900" />
                              ) : (
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface-900" />
                              )}
                            </div>
                          )}

                        <button
                          onClick={() =>
                            handleCellClick(
                              row.rumah_id,
                              row.nomor_rumah,
                              row.rt,
                              m,
                              status
                            )
                          }
                          disabled={!canToggle}
                          title={
                            canToggle
                              ? `Klik untuk ubah status iuran ${BULAN_LABELS[m]} (Konfirmasi 3s)`
                              : userRole === 'pengurus'
                                ? 'Pengurus tidak dapat merubah status iuran'
                                : 'Hanya Superadmin & Bendahara yang dapat menginput iuran'
                          }
                          className={`
                            inline-flex items-center justify-center w-8 h-8 rounded-xl text-xs font-bold
                            transition-all duration-150
                            ${
                              isLunas
                                ? 'bg-success-500/15 text-success-600 dark:text-success-400'
                                : 'bg-danger-500/10 text-danger-500 dark:text-danger-400'
                            }
                            ${
                              canToggle
                                ? 'hover:scale-110 hover:shadow-md cursor-pointer active:scale-95'
                                : 'cursor-not-allowed opacity-60'
                            }
                            ${isTarget ? 'ring-2 ring-primary-500 scale-110' : ''}
                          `}
                        >
                          {isLunas ? (
                            <Check className="w-3.5 h-3.5" strokeWidth={3} />
                          ) : (
                            <X className="w-3.5 h-3.5" strokeWidth={3} />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
              {filteredData.length === 0 && (
                <tr>
                  <td
                    colSpan={14}
                    className="px-4 py-12 text-center text-surface-700/50 dark:text-surface-200/40"
                  >
                    <Home className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>Tidak ada rumah ditemukan pada filter ini.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Footer ────────────────────────────────────── */}
        <div className="px-4 py-3 bg-surface-50 dark:bg-surface-800/30 border-t border-surface-200 dark:border-surface-800 flex items-center justify-between text-xs text-surface-700/60 dark:text-surface-200/40">
          <span>
            Menampilkan <strong>{filteredData.length}</strong> dari{' '}
            <strong>{data.length}</strong> unit rumah
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-success-500/20 flex items-center justify-center">
                <Check className="w-2 h-2 text-success-600" strokeWidth={3} />
              </div>
              Lunas
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-danger-500/15 flex items-center justify-center">
                <X className="w-2 h-2 text-danger-500" strokeWidth={3} />
              </div>
              Belum Lunas
            </div>
            {!canToggle ? (
              <span className="text-warning-500 font-semibold bg-warning-500/10 px-2 py-0.5 rounded">
                ⚠ Input Iuran: Superadmin & Bendahara Only
              </span>
            ) : (
              <span className="text-success-600 font-semibold bg-success-500/10 px-2 py-0.5 rounded">
                ✓ Klik sel status untuk konfirmasi 3s ({userRole === 'superadmin' ? 'Superadmin' : 'Bendahara'})
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
