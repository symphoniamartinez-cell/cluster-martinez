'use client';

// ============================================================
// Admin Event & Kupon Management Page — /admin/events
// Event dashboard, Tenant Booth Real-Time Redemption Reports,
// Manual Field Coupon Addition, & QR Code Verification
// Super App Cluster Martinez
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Ticket,
  Plus,
  QrCode,
  CheckCircle2,
  XCircle,
  Calendar,
  MapPin,
  Search,
  Sparkles,
  RefreshCw,
  Shield,
  Building,
  Check,
  AlertTriangle,
  UserCheck,
  Layers,
  Store,
  BarChart3,
  PlusCircle,
  Key,
} from 'lucide-react';
import type { EventAcara, KuponAcara, UserRole, TenantBooth } from '@/types';
import {
  getEventsFromStorage,
  getKuponsFromStorage,
  getBoothsFromStorage,
  scanAndUseKupon,
  addManualKupon,
  getBoothReportForEvent,
  DEFAULT_RULES,
} from '@/lib/event-store';

export default function AdminEventsPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'events' | 'reports' | 'scan' | 'kupons' | 'booths'>('events');
  const [userRole, setUserRole] = useState<UserRole>('superadmin');
  const [userName, setUserName] = useState('Admin');

  const [events, setEvents] = useState<EventAcara[]>([]);
  const [kupons, setKupons] = useState<KuponAcara[]>([]);
  const [booths, setBooths] = useState<TenantBooth[]>([]);

  const [selectedEventId, setSelectedEventId] = useState<string>('');

  // Scan Form State
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    kupon?: KuponAcara;
  } | null>(null);

  // Manual Coupon Creation Modal (Field Correction)
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualHouse, setManualHouse] = useState('');
  const [manualCount, setManualCount] = useState(1);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [kuponSearch, setKuponSearch] = useState('');
  const [kuponStatusFilter, setKuponStatusFilter] = useState<'all' | 'unused' | 'used'>('all');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = () => {
    const evts = getEventsFromStorage();
    const kps = getKuponsFromStorage();
    const bths = getBoothsFromStorage();

    setEvents(evts);
    setKupons(kps);
    setBooths(bths);

    if (evts.length > 0 && !selectedEventId) {
      setSelectedEventId(evts[0].id);
    }
  };

  useEffect(() => {
    const stored = sessionStorage.getItem('demo_user');
    if (stored) {
      const u = JSON.parse(stored);
      setUserRole(u.role);
      setUserName(u.label);
    }
    loadData();
  }, []);

  // Real-Time Booth Report Calculation
  const boothReport = useMemo(() => {
    if (!selectedEventId) return null;
    return getBoothReportForEvent(selectedEventId);
  }, [selectedEventId, kupons, booths]);

  // Handle Manual Coupon Creation (Field Correction)
  const handleAddManualKupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualHouse.trim()) {
      alert('Nomor / Alamat Rumah Wajib Diisi!');
      return;
    }

    const created = addManualKupon(selectedEventId || (events[0]?.id || 'evt-001'), manualHouse, manualCount);
    loadData();
    setShowManualModal(false);
    setManualHouse('');
    setManualCount(1);
    showToast(`${created.length} Kupon Manual berhasil dibuat untuk ${manualHouse}!`);
  };

  // Handle Scan Kupon
  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    const res = scanAndUseKupon(scanInput, userName);
    setScanResult(res);
    loadData();
  };

  // Filtered Kupon List (Strictly scoped by Selected Event)
  const filteredKupons = useMemo(() => {
    return kupons.filter((k) => {
      const matchEvent = !selectedEventId || k.event_id === selectedEventId;

      const matchSearch =
        !kuponSearch ||
        k.kode_kupon.toUpperCase().includes(kuponSearch.toUpperCase()) ||
        k.nomor_rumah.toUpperCase().includes(kuponSearch.toUpperCase()) ||
        k.nama_event.toUpperCase().includes(kuponSearch.toUpperCase());

      const matchStatus =
        kuponStatusFilter === 'all' ||
        (kuponStatusFilter === 'unused' && !k.is_used) ||
        (kuponStatusFilter === 'used' && k.is_used);

      return matchEvent && matchSearch && matchStatus;
    });
  }, [kupons, selectedEventId, kuponSearch, kuponStatusFilter]);

  return (
    <div className="space-y-6 max-w-[1300px] mx-auto animate-fade-in pb-12">
      {/* ── Toast Notification ───────────────────────────────── */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-5 py-3.5 bg-surface-900 text-white rounded-2xl shadow-2xl border border-white/10 animate-fade-in text-sm font-medium">
          <Check className="w-4 h-4 text-success-400 flex-shrink-0" />
          {toastMessage}
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-accent-500 to-primary-500 shadow-lg shadow-accent-500/20">
            <Ticket className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-surface-900 dark:text-white">
              Manajemen Event, Kupon & Booth Makanan
            </h1>
            <p className="text-sm text-surface-700/60 dark:text-surface-200/50 mt-0.5">
              Kelola event kluster, akun tenant booth makanan, laporan penukaran kupon, & tambah kupon manual
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Manual Coupon Button */}
          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
            title="Tambah Kupon Manual untuk koreksi kesalahan data lapangan"
          >
            <PlusCircle className="w-4 h-4 text-accent-500" />
            + Kupon Manual Lapangan
          </button>

          {/* Full Page Create Event Button */}
          <button
            onClick={() => router.push('/admin/events/create')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-accent-500 to-primary-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-accent-500/25 hover:brightness-110 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Buat Event & Peraturan Kupon
          </button>
        </div>
      </div>

      {/* ── Tab Switcher ─────────────────────────────────────── */}
      <div className="flex flex-wrap bg-white dark:bg-surface-900 p-1.5 rounded-2xl border border-surface-200 dark:border-surface-800 w-fit gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('events')}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer
            ${
              activeTab === 'events'
                ? 'bg-accent-500 text-white shadow-md shadow-accent-500/20'
                : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
            }
          `}
        >
          <Calendar className="w-4 h-4" />
          Daftar Event ({events.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer
            ${
              activeTab === 'reports'
                ? 'bg-accent-500 text-white shadow-md shadow-accent-500/20'
                : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
            }
          `}
        >
          <BarChart3 className="w-4 h-4" />
          Laporan Penukaran Per Booth
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('booths')}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer
            ${
              activeTab === 'booths'
                ? 'bg-accent-500 text-white shadow-md shadow-accent-500/20'
                : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
            }
          `}
        >
          <Store className="w-4 h-4" />
          Akun Tenant Booth ({booths.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('kupons')}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer
            ${
              activeTab === 'kupons'
                ? 'bg-accent-500 text-white shadow-md shadow-accent-500/20'
                : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
            }
          `}
        >
          <Ticket className="w-4 h-4" />
          Semua Kupon Warga ({kupons.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('scan')}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer
            ${
              activeTab === 'scan'
                ? 'bg-accent-500 text-white shadow-md shadow-accent-500/20'
                : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
            }
          `}
        >
          <QrCode className="w-4 h-4" />
          Scan Verifikasi (Admin)
        </button>
      </div>

      {/* ── TAB 1: DAFTAR EVENT ACARA ─────────────────────────── */}
      {activeTab === 'events' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((evt) => {
            const countKuponsForEvt = kupons.filter((k) => k.event_id === evt.id).length;
            const usedKuponsForEvt = kupons.filter((k) => k.event_id === evt.id && k.is_used).length;
            const boothCountForEvt = booths.filter((b) => b.event_id === evt.id).length;
            const rules = evt.rules || DEFAULT_RULES;

            return (
              <div
                key={evt.id}
                className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-surface-100 dark:border-surface-800">
                    <span className="px-2.5 py-0.5 bg-accent-500/10 text-accent-600 dark:text-accent-400 font-bold rounded-full text-[10px]">
                      Event Aktif
                    </span>
                    <span className="text-xs font-mono text-surface-400">
                      {evt.tanggal_event}
                    </span>
                  </div>

                  <h3 className="font-bold text-surface-900 dark:text-white text-base mb-1">
                    {evt.nama_event}
                  </h3>

                  <p className="text-xs text-surface-500 mb-4 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-accent-500" />
                    {evt.lokasi_event}
                  </p>

                  {/* Leveling Rules Summary */}
                  <div className="p-3 bg-surface-50 dark:bg-surface-800/60 rounded-2xl space-y-1 text-[11px] mb-4 border border-surface-200 dark:border-surface-700">
                    <p className="font-bold text-surface-700 dark:text-surface-200 mb-1 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-primary-500" />
                      Rule Kupon:
                    </p>
                    <div className="flex justify-between text-surface-600 dark:text-surface-300">
                      <span>T1 (&ge;{rules.tier1_min_bulan ?? 8} Bln): <strong>{rules.tier1_kupon ?? rules.full_lunas_12 ?? 5} Kpn</strong></span>
                      <span>T2 (&ge;{rules.tier2_min_bulan ?? 5} Bln): <strong>{rules.tier2_kupon ?? rules.rajin_8_11 ?? 3} Kpn</strong></span>
                    </div>
                    <div className="flex justify-between text-surface-600 dark:text-surface-300">
                      <span>T3 (&ge;{rules.tier3_min_bulan ?? 1} Bln): <strong>{rules.tier3_kupon ?? rules.bolong_1_7 ?? 1} Kpn</strong></span>
                      <span>Tidak Bayar: <strong>{rules.tidak_bayar_0 ?? 0} Kpn</strong></span>
                    </div>
                  </div>

                  <div className="p-3 bg-accent-500/5 rounded-2xl space-y-1 text-xs mb-4 border border-accent-500/10">
                    <div className="flex justify-between">
                      <span className="text-surface-500">Total Kupon:</span>
                      <span className="font-mono font-bold text-accent-600 dark:text-accent-400">{countKuponsForEvt} Kupon</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-500">Kupon Ditukar:</span>
                      <span className="font-mono font-bold text-danger-500">{usedKuponsForEvt} Kupon</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-surface-200 dark:border-surface-700">
                      <span className="text-surface-500">Tenant Booth Makanan:</span>
                      <span className="font-semibold text-surface-900 dark:text-white">{boothCountForEvt} Booth</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-100 dark:border-surface-800">
                  <button
                    onClick={() => {
                      setSelectedEventId(evt.id);
                      setActiveTab('reports');
                    }}
                    className="py-2 px-2.5 bg-gradient-to-r from-accent-500 to-primary-500 hover:from-accent-600 hover:to-primary-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Laporan
                  </button>

                  <button
                    onClick={() => {
                      setSelectedEventId(evt.id);
                      setActiveTab('booths');
                    }}
                    className="py-2 px-2.5 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 font-bold text-xs rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                  >
                    <Store className="w-3.5 h-3.5 text-accent-500" />
                    Booth ({boothCountForEvt})
                  </button>

                  <button
                    onClick={() => {
                      setSelectedEventId(evt.id);
                      setActiveTab('kupons');
                    }}
                    className="py-2 px-2.5 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 font-bold text-xs rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                  >
                    <Ticket className="w-3.5 h-3.5 text-primary-500" />
                    Kupon ({countKuponsForEvt})
                  </button>

                  <button
                    onClick={() => {
                      setSelectedEventId(evt.id);
                      setShowManualModal(true);
                    }}
                    className="py-2 px-2.5 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 font-bold text-xs rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-success-500" />
                    + Manual
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB 2: LAPORAN PENUKARAN KUPON PER BOOTH MAKANAN ─── */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Event Selector for Report */}
          <div className="bg-white dark:bg-surface-900 p-4 rounded-2xl border border-surface-200 dark:border-surface-800 flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-accent-500" />
            <span className="text-xs font-bold text-surface-700 dark:text-surface-200">
              Pilih Event Acara:
            </span>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="p-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs font-bold text-surface-900 dark:text-white focus:outline-none"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.nama_event} ({evt.tanggal_event})
                </option>
              ))}
            </select>
          </div>

          {boothReport && (
            <div className="space-y-6">
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-surface-900 p-4 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm">
                  <span className="text-[11px] font-bold uppercase text-surface-500 block mb-1">
                    Total Kupon Diterbitkan
                  </span>
                  <span className="text-2xl font-bold font-mono text-accent-600 dark:text-accent-400">
                    {boothReport.totalEventKupons} <span className="text-xs font-normal text-surface-400">Kupon</span>
                  </span>
                </div>

                <div className="bg-white dark:bg-surface-900 p-4 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm">
                  <span className="text-[11px] font-bold uppercase text-surface-500 block mb-1">
                    Total Kupon Sudah Ditukar di Booth
                  </span>
                  <span className="text-2xl font-bold font-mono text-success-500">
                    {boothReport.totalUsedKupons} <span className="text-xs font-normal text-surface-400">Kupon</span>
                  </span>
                </div>

                <div className="bg-white dark:bg-surface-900 p-4 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm">
                  <span className="text-[11px] font-bold uppercase text-surface-500 block mb-1">
                    Sisa Kupon Belum Ditukar
                  </span>
                  <span className="text-2xl font-bold font-mono text-warning-500">
                    {boothReport.totalUnusedKupons} <span className="text-xs font-normal text-surface-400">Kupon</span>
                  </span>
                </div>
              </div>

              {/* Booth Breakdown Cards */}
              <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-surface-900 dark:text-white text-base border-b border-surface-100 dark:border-surface-800 pb-3">
                  Rincian Penukaran Kupon Per Booth Makanan
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {boothReport.boothStats.map((st) => (
                    <div
                      key={st.booth.id}
                      className="p-5 bg-surface-50 dark:bg-surface-800/60 rounded-2xl border border-surface-200 dark:border-surface-700 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Store className="w-4.5 h-4.5 text-accent-500" />
                          <h4 className="font-bold text-sm text-surface-900 dark:text-white">
                            {st.booth.nama_booth}
                          </h4>
                        </div>
                        <span className="px-2.5 py-1 bg-accent-500/10 text-accent-600 dark:text-accent-400 font-mono font-bold text-xs rounded-full">
                          {st.countScanned} Kupon Ditukar
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-[11px] font-semibold text-surface-500 mb-1">
                          <span>Kontribusi Penukaran:</span>
                          <span>{st.percentage}%</span>
                        </div>
                        <div className="w-full bg-surface-200 dark:bg-surface-700 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-accent-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${st.percentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Details Accordion List */}
                      {st.details.length > 0 && (
                        <div className="pt-2 border-t border-surface-200 dark:border-surface-700">
                          <p className="text-[10px] uppercase font-bold text-surface-400 mb-1.5">
                            Daftar Rumah Penukar:
                          </p>
                          <div className="max-h-32 overflow-y-auto space-y-1 text-[11px]">
                            {st.details.map((dt) => (
                              <div
                                key={dt.id}
                                className="flex justify-between font-mono bg-white dark:bg-surface-900 px-2.5 py-1 rounded-lg border border-surface-200 dark:border-surface-800"
                              >
                                <span className="font-bold text-primary-600 dark:text-primary-400">
                                  {dt.nomor_rumah}
                                </span>
                                <span className="text-surface-400">
                                  {dt.used_at ? new Date(dt.used_at).toLocaleTimeString('id-ID') : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {boothReport.boothStats.length === 0 && (
                    <p className="text-center py-6 text-xs text-surface-500 col-span-2">
                      Belum ada tenant booth makanan terdaftar untuk event ini.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: AKUN TENANT BOOTH ─────────────────────────── */}
      {activeTab === 'booths' && (
        <div className="space-y-6">
          {/* Event Selector */}
          <div className="bg-white dark:bg-surface-900 p-4 rounded-2xl border border-surface-200 dark:border-surface-800 flex items-center gap-3">
            <Store className="w-5 h-5 text-accent-500" />
            <span className="text-xs font-bold text-surface-700 dark:text-surface-200">
              Pilih Event Acara:
            </span>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="p-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs font-bold text-surface-900 dark:text-white"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.nama_event} ({evt.tanggal_event})
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-surface-800">
              <div>
                <h3 className="font-bold text-surface-900 dark:text-white text-base">
                  Kredensial Akun Login Tenant Booth Makanan
                </h3>
                <p className="text-xs text-surface-500">
                  Daftar akun booth untuk event ini. Penjaga booth login di <code>/login</code> (Default pass: <code>event123</code>).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {booths
                .filter((b) => !selectedEventId || b.event_id === selectedEventId)
                .map((b) => (
                  <div
                    key={b.id}
                    className="p-4 bg-surface-50 dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-surface-900 dark:text-white flex items-center gap-2">
                        <Store className="w-4 h-4 text-accent-500" />
                        {b.nama_booth}
                      </span>
                      <span className="px-2 py-0.5 bg-success-500/10 text-success-600 dark:text-success-400 font-mono font-bold rounded text-[10px]">
                        {b.total_scanned} Scanned
                      </span>
                    </div>

                    <div className="pt-2 border-t border-surface-200 dark:border-surface-700 space-y-1 font-mono">
                      <div className="flex justify-between">
                        <span className="text-surface-500">Username Login:</span>
                        <strong className="text-primary-600 dark:text-primary-400">{b.username}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-surface-500">Password:</span>
                        <strong className="text-surface-900 dark:text-white">{b.password || 'event123'}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              {booths.filter((b) => !selectedEventId || b.event_id === selectedEventId).length === 0 && (
                <p className="text-center py-6 text-xs text-surface-500 col-span-2">
                  Belum ada tenant booth makanan terdaftar untuk event ini.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: SEMUA KUPON WARGA ─────────────────────────── */}
      {activeTab === 'kupons' && (
        <div className="space-y-6">
          {/* Event Selector */}
          <div className="bg-white dark:bg-surface-900 p-4 rounded-2xl border border-surface-200 dark:border-surface-800 flex items-center gap-3">
            <Ticket className="w-5 h-5 text-accent-500" />
            <span className="text-xs font-bold text-surface-700 dark:text-surface-200">
              Pilih Event Acara:
            </span>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="p-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs font-bold text-surface-900 dark:text-white"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.nama_event} ({evt.tanggal_event})
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 border-b border-surface-100 dark:border-surface-800">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  type="text"
                  value={kuponSearch}
                  onChange={(e) => setKuponSearch(e.target.value)}
                  placeholder="Cari kode kupon / no rumah..."
                className="w-full pl-9 pr-4 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs font-medium focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 bg-surface-100 dark:bg-surface-800 p-1 rounded-xl text-xs">
              <button
                onClick={() => setKuponStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  kuponStatusFilter === 'all' ? 'bg-white dark:bg-surface-700 shadow-sm text-surface-900 dark:text-white' : 'text-surface-500'
                }`}
              >
                Semua ({kupons.length})
              </button>
              <button
                onClick={() => setKuponStatusFilter('unused')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  kuponStatusFilter === 'unused' ? 'bg-success-500 text-white shadow-sm' : 'text-surface-500'
                }`}
              >
                Belum Digunakan ({kupons.filter((k) => !k.is_used).length})
              </button>
              <button
                onClick={() => setKuponStatusFilter('used')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  kuponStatusFilter === 'used' ? 'bg-danger-500 text-white shadow-sm' : 'text-surface-500'
                }`}
              >
                Sudah Digunakan ({kupons.filter((k) => k.is_used).length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-700 text-surface-500 uppercase tracking-wider font-semibold">
                  <th className="px-4 py-3">Kode Kupon</th>
                  <th className="px-4 py-3">Jenis Kupon</th>
                  <th className="px-4 py-3">Rumah</th>
                  <th className="px-4 py-3">Flag Status</th>
                  <th className="px-4 py-3">Penukar & Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {filteredKupons.map((k) => (
                  <tr key={k.id} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/50">
                    <td className="px-4 py-3 font-mono font-bold text-surface-900 dark:text-white">
                      {k.kode_kupon}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-md bg-primary-500/10 text-primary-600 dark:text-primary-400 text-[10px] font-bold">
                        {k.kategori_nama || k.nama_kupon || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-primary-600 dark:text-primary-400">
                      {k.nomor_rumah}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          k.is_used
                            ? 'bg-danger-500/10 text-danger-500 border border-danger-500/20'
                            : 'bg-success-500/10 text-success-600 border border-success-500/20'
                        }`}
                      >
                        {k.is_used ? '🔴 SUDAH DIGUNAKAN' : '🟢 BELUM DIGUNAKAN'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-surface-400">
                      {k.is_used ? (
                        <span>
                          {k.used_by_booth_nama || k.used_by_admin || 'Admin'} ({k.used_at ? new Date(k.used_at).toLocaleTimeString('id-ID') : '-'})
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

      {/* ── TAB 5: SCAN VERIFIKASI (ADMIN) ──────────────────── */}
      {activeTab === 'scan' && (
        <div className="space-y-6">
          {/* Event Selector */}
          <div className="bg-white dark:bg-surface-900 p-4 rounded-2xl border border-surface-200 dark:border-surface-800 flex items-center gap-3">
            <QrCode className="w-5 h-5 text-accent-500" />
            <span className="text-xs font-bold text-surface-700 dark:text-surface-200">
              Pilih Event Acara:
            </span>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="p-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs font-bold text-surface-900 dark:text-white"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.nama_event} ({evt.tanggal_event})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 p-6 lg:p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-100 dark:border-surface-800">
                <QrCode className="w-5 h-5 text-accent-500" />
                <div>
                  <h2 className="text-base font-bold text-surface-900 dark:text-white">
                    Verifikasi Kupon Manual Admin
                  </h2>
                  <p className="text-xs text-surface-500">
                    Verifikasi langsung oleh pengurus/admin kluster.
                  </p>
                </div>
              </div>

            <form onSubmit={handleScanSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-surface-500 mb-2">
                  Kode Kupon Warga
                </label>
                <input
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="Contoh: MTZ-MTNR11-2026-01"
                  className="w-full pl-4 pr-4 py-3.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-2xl font-mono text-base font-bold text-surface-900 dark:text-white focus:outline-none uppercase"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-accent-500 to-primary-500 text-white font-bold text-sm rounded-2xl shadow-lg cursor-pointer"
              >
                Verifikasi Kupon
              </button>
            </form>
          </div>

          {/* Result Card */}
          <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 p-6 lg:p-8 shadow-sm">
            {scanResult ? (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-2xl border ${
                    scanResult.success
                      ? 'bg-success-500/10 border-success-500/30 text-success-600'
                      : 'bg-danger-500/10 border-danger-500/30 text-danger-600'
                  }`}
                >
                  <h4 className="font-bold text-sm">
                    {scanResult.success ? 'Kupon Valid!' : 'Scan Gagal'}
                  </h4>
                  <p className="text-xs mt-1">{scanResult.message}</p>
                </div>
              </div>
            ) : (
              <p className="text-center py-12 text-surface-400 text-sm">
                Belum ada kupon di-scan.
              </p>
            )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL TAMBAH KUPON MANUAL (KOREKSI LAPANGAN) ───────── */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowManualModal(false)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-3xl shadow-2xl border border-surface-200 dark:border-surface-800 animate-fade-in overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-accent-500 to-primary-500" />
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-accent-500/10 text-accent-500">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-surface-900 dark:text-white">
                    Tambah Kupon Manual (Koreksi Data Lapangan)
                  </h3>
                  <p className="text-xs text-surface-500">
                    Gunakan untuk menambahkan kupon jika ada kesalahan data iuran warga.
                  </p>
                </div>
              </div>

              <form onSubmit={handleAddManualKupon} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-surface-700 dark:text-surface-200 mb-1">
                    Event Acara Tujuan
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl font-bold"
                  >
                    {events.map((evt) => (
                      <option key={evt.id} value={evt.id}>
                        {evt.nama_event}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-surface-700 dark:text-surface-200 mb-1">
                    Nomor / Alamat Rumah Warga *
                  </label>
                  <input
                    type="text"
                    value={manualHouse}
                    onChange={(e) => setManualHouse(e.target.value)}
                    placeholder="Contoh: MTNU3/2 atau MTNR/11"
                    required
                    className="w-full p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl font-bold font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block font-bold text-surface-700 dark:text-surface-200 mb-1">
                    Jumlah Kupon Manual
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={manualCount}
                    onChange={(e) => setManualCount(Number(e.target.value))}
                    required
                    className="w-full p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl font-bold text-center"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-100 dark:border-surface-800">
                  <button
                    type="button"
                    onClick={() => setShowManualModal(false)}
                    className="px-4 py-2.5 text-surface-600 font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-accent-500 to-primary-500 text-white font-bold rounded-xl shadow-md cursor-pointer"
                  >
                    Terbitkan Kupon Manual
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
