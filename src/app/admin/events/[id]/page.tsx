'use client';

// ============================================================
// Dedicated Single Event Detail Page — /admin/events/[id]
// Manages Coupons, Tenant Booths, Reports & Scanner for ONE specific event
// 100% Prevents Dropdown Reset & Jumping Bugs
// Super App Cluster Martinez
// ============================================================

import { useState, useEffect, useMemo, use } from 'react';
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
  ArrowLeft,
  Store,
  BarChart3,
  PlusCircle,
  Key,
  Trash2,
  Check,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  Building2,
  Clock,
} from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import type { EventAcara, KuponAcara, UserRole, TenantBooth } from '@/types';
import {
  getEventsFromStorage,
  getKuponsFromStorage,
  getBoothsFromStorage,
  deleteEvent,
  deleteKupon,
  addManualKupon,
  getBoothReportForEvent,
  scanAndUseKupon,
  syncEventDataFromCloud,
  updateBoothCategories,
} from '@/lib/event-store';

export default function SingleEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id: eventId } = use(params);

  const [activeTab, setActiveTab] = useState<'kupons' | 'booths' | 'reports' | 'scan'>('kupons');
  const [userRole, setUserRole] = useState<UserRole>('superadmin');
  const [userName, setUserName] = useState('Admin');

  const [event, setEvent] = useState<EventAcara | null>(null);
  const [kupons, setKupons] = useState<KuponAcara[]>([]);
  const [booths, setBooths] = useState<TenantBooth[]>([]);

  // Scan Form State
  const [scanInput, setScanInput] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    kupon?: KuponAcara;
  } | null>(null);

  // Pagination State
  const [kuponPageSize, setKuponPageSize] = useState<number>(50);
  const [kuponCurrentPage, setKuponCurrentPage] = useState<number>(1);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [kuponSearch, setKuponSearch] = useState('');
  const [kuponStatusFilter, setKuponStatusFilter] = useState<'all' | 'unused' | 'used'>('all');
  const [isSyncing, setIsSyncing] = useState(false);

  // Booth Edit State
  const [editingBoothId, setEditingBoothId] = useState<string | null>(null);
  const [editBoothCategories, setEditBoothCategories] = useState<string[]>([]);
  const [isSavingBooth, setIsSavingBooth] = useState(false);

  const handleEditBoothClick = (booth: TenantBooth) => {
    setEditingBoothId(booth.id);
    setEditBoothCategories(booth.allowed_categories || []);
  };

  const handleSaveBoothCategories = async () => {
    if (!editingBoothId) return;
    if (editBoothCategories.length === 0) {
      alert("Harap pilih minimal 1 kategori untuk booth ini.");
      return;
    }
    setIsSavingBooth(true);
    const success = await updateBoothCategories(editingBoothId, editBoothCategories);
    setIsSavingBooth(false);
    if (success) {
      setEditingBoothId(null);
      loadEventData();
      showToast("Kategori kupon booth berhasil diperbarui!");
    } else {
      alert("Gagal menyimpan kategori booth.");
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadEventData = () => {
    const allEvents = getEventsFromStorage();
    const currentEvt = allEvents.find((e) => e.id === eventId);
    if (!currentEvt) {
      setEvent(null);
      return;
    }
    setEvent(currentEvt);

    const allKupons = getKuponsFromStorage();
    const eventKupons = allKupons.filter((k) => k.event_id === eventId);
    setKupons(eventKupons);

    const allBooths = getBoothsFromStorage();
    const eventBooths = allBooths.filter((b) => b.event_id === eventId);
    setBooths(eventBooths);
  };

  const handleSyncData = async () => {
    if (!eventId) return;
    setIsSyncing(true);
    const res = await syncEventDataFromCloud(eventId);
    if (res.success && res.updated) {
      loadEventData();
      showToast('Data berhasil disinkronisasi dengan Cloud!');
    } else if (res.success && !res.updated) {
      showToast('Data sudah versi terbaru.');
    } else {
      showToast('Gagal sinkronisasi dari Cloud.');
    }
    setIsSyncing(false);
  };

  useEffect(() => {
    const stored = sessionStorage.getItem('demo_user');
    if (stored) {
      const u = JSON.parse(stored);
      setUserRole(u.role);
      setUserName(u.label);
    }
    loadEventData();

    // Sync from cloud in the background to get latest scanned coupons from booths
    if (eventId) {
      syncEventDataFromCloud(eventId).then((res) => {
        if (res.success && res.updated) {
          loadEventData(); // refresh local state
        }
      });
    }
  }, [eventId]);

  // Filtered Kupons for this Event
  const filteredKupons = useMemo(() => {
    return kupons.filter((k) => {
      const matchSearch =
        !kuponSearch ||
        k.kode_kupon.toLowerCase().includes(kuponSearch.toLowerCase().trim()) ||
        k.nomor_rumah.toLowerCase().includes(kuponSearch.toLowerCase().trim()) ||
        (k.kategori_nama || k.nama_kupon || '').toLowerCase().includes(kuponSearch.toLowerCase().trim());

      const matchStatus =
        kuponStatusFilter === 'all' ||
        (kuponStatusFilter === 'used' && k.is_used) ||
        (kuponStatusFilter === 'unused' && !k.is_used);

      return matchSearch && matchStatus;
    });
  }, [kupons, kuponSearch, kuponStatusFilter]);

  // Booth Reports computation
  const boothReport = useMemo(() => {
    if (!event) return null;
    return getBoothReportForEvent(event.id);
  }, [event, kupons, booths]);


  // Handle Delete Kupon
  const handleDeleteSingleKupon = async (kuponId: string, kodeKupon: string) => {
    if (confirm(`Hapus kupon "${kodeKupon}" secara permanen?`)) {
      await deleteKupon(kuponId);
      loadEventData();
      showToast(`Kupon ${kodeKupon} berhasil dihapus.`);
    }
  };

  // Handle Delete Event
  const handleDeleteEventClick = async () => {
    if (!event) return;
    if (confirm(`Hapus event "${event.nama_event}" beserta seluruh kupon & booth yang terdaftar?`)) {
      await deleteEvent(event.id);
      router.push('/admin/events');
    }
  };

  const processScan = async (code: string) => {
    if (!code.trim()) return;
    const res = await scanAndUseKupon(code.trim(), userName);
    setScanResult(res);
    setScanInput('');
    loadEventData();
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await processScan(scanInput);
  };

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-warning-500 mx-auto" />
        <h2 className="text-xl font-bold text-surface-900 dark:text-white">Event Tidak Ditemukan</h2>
        <p className="text-sm text-surface-500">Event yang Anda cari tidak ditemukan atau telah dihapus.</p>
        <button
          onClick={() => router.push('/admin/events')}
          className="px-4 py-2 bg-primary-500 text-white font-bold text-xs rounded-xl cursor-pointer"
        >
          &larr; Kembali ke Daftar Event
        </button>
      </div>
    );
  }

  const unusedCount = kupons.filter((k) => !k.is_used).length;
  const usedCount = kupons.filter((k) => k.is_used).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* ── Toast Message ────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-5 py-3.5 bg-surface-900 text-white rounded-2xl shadow-2xl border border-white/10 animate-fade-in text-sm font-medium">
          <Check className="w-4 h-4 text-success-400 flex-shrink-0" />
          {toastMessage}
        </div>
      )}

      {/* ── Back & Event Title Header ────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-surface-900 p-6 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-sm">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.push('/admin/events')}
            className="p-2.5 hover:bg-surface-100 dark:hover:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-2xl transition-colors cursor-pointer text-surface-600 dark:text-surface-300 mt-1"
            title="Kembali ke Daftar Event"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl lg:text-2xl font-extrabold text-surface-900 dark:text-white">
                {event.nama_event}
              </h1>
              <span className="px-3 py-0.5 bg-accent-500/10 text-accent-600 dark:text-accent-400 text-xs font-bold rounded-full border border-accent-500/20">
                {event.tanggal_event}
              </span>
            </div>
            <p className="text-xs text-surface-500 mt-1 flex items-center gap-3">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary-500" />
                {event.lokasi_event}
              </span>
              <span>•</span>
              <span className="font-semibold text-primary-600 dark:text-primary-400">
                Total {kupons.length} Kupon
              </span>
              <span>•</span>
              <span className="font-semibold text-accent-600 dark:text-accent-400">
                {booths.length} Booth
              </span>
              <span>•</span>
              <button
                onClick={handleSyncData}
                disabled={isSyncing}
                className="flex items-center gap-1 px-2 py-1 bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors font-bold disabled:opacity-50 cursor-pointer"
              >
                <div className={isSyncing ? 'animate-spin' : ''}>
                  <RefreshCw className="w-3 h-3" />
                </div>
                {isSyncing ? 'Syncing...' : 'Sync Cloud'}
              </button>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/admin/events/tambah-kupon?eventId=' + event.id)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            Kupon Manual Lapangan
          </button>

          {(userRole === 'superadmin' || userRole === 'pengurus') && (
            <button
              onClick={handleDeleteEventClick}
              className="p-2.5 hover:bg-danger-500/10 text-surface-400 hover:text-danger-500 border border-surface-200 dark:border-surface-700 hover:border-danger-500/30 rounded-xl transition-colors cursor-pointer"
              title="Hapus Event Ini"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Tab Switcher for This Event ──────────────────────── */}
      <div className="flex bg-white dark:bg-surface-900 p-1.5 rounded-2xl border border-surface-200 dark:border-surface-800 w-fit overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('kupons')}
          className={`
            flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap
            ${
              activeTab === 'kupons'
                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
            }
          `}
        >
          <Ticket className="w-4 h-4" />
          Kupon Warga ({kupons.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('booths')}
          className={`
            flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap
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
          onClick={() => setActiveTab('reports')}
          className={`
            flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap
            ${
              activeTab === 'reports'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
            }
          `}
        >
          <BarChart3 className="w-4 h-4" />
          Laporan Penukaran
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('scan')}
          className={`
            flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap
            ${
              activeTab === 'scan'
                ? 'bg-success-600 text-white shadow-md shadow-success-500/20'
                : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
            }
          `}
        >
          <QrCode className="w-4 h-4" />
          Scanner QR Verifikasi
        </button>
      </div>

      {/* ── TAB 1: KUPON WARGA EVENT INI ─────────────────────── */}
      {activeTab === 'kupons' && (
        <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                value={kuponSearch}
                onChange={(e) => {
                  setKuponSearch(e.target.value);
                  setKuponCurrentPage(1);
                }}
                placeholder="Cari No. Rumah / Kode / Jenis Kupon..."
                className="w-full pl-10 pr-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => { setKuponStatusFilter('all'); setKuponCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                  kuponStatusFilter === 'all'
                    ? 'bg-surface-900 text-white dark:bg-white dark:text-surface-900'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300'
                }`}
              >
                Semua ({kupons.length})
              </button>
              <button
                onClick={() => { setKuponStatusFilter('unused'); setKuponCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                  kuponStatusFilter === 'unused'
                    ? 'bg-success-500 text-white'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300'
                }`}
              >
                Belum Digunakan ({unusedCount})
              </button>
              <button
                onClick={() => { setKuponStatusFilter('used'); setKuponCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                  kuponStatusFilter === 'used'
                    ? 'bg-danger-500 text-white'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300'
                }`}
              >
                Sudah Digunakan ({usedCount})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-800 text-surface-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Kode Kupon</th>
                  <th className="py-3 px-4">Jenis Kupon</th>
                  <th className="py-3 px-4">No. Rumah</th>
                  <th className="py-3 px-4">Flag Status</th>
                  <th className="py-3 px-4">Penukar & Waktu</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {(() => {
                  const startIndex = (kuponCurrentPage - 1) * kuponPageSize;
                  const paginatedKupons = filteredKupons.slice(startIndex, startIndex + kuponPageSize);
                  
                  if (paginatedKupons.length === 0) {
                    return (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-surface-400">
                          Tidak ada data kupon yang sesuai filter.
                        </td>
                      </tr>
                    );
                  }
                  
                  return paginatedKupons.map((k) => (
                    <tr key={k.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-surface-900 dark:text-white">
                        {k.kode_kupon}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 bg-primary-500/10 text-primary-600 dark:text-primary-400 font-semibold rounded-full text-[11px]">
                          {k.kategori_nama || k.nama_kupon || 'Kupon Event'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-primary-600 dark:text-primary-400">
                        {k.nomor_rumah}
                      </td>
                      <td className="py-3 px-4">
                        {k.is_used ? (
                          <span className="px-2.5 py-0.5 bg-danger-500/10 text-danger-600 dark:text-danger-400 font-bold rounded-full text-[10px] uppercase">
                            🔴 SUDAH DIGUNAKAN
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-success-500/10 text-success-600 dark:text-success-400 font-bold rounded-full text-[10px] uppercase">
                            🟢 BELUM DIGUNAKAN
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-surface-500">
                        {k.is_used ? (
                          <div>
                            <p className="font-semibold text-surface-800 dark:text-surface-200">
                              {k.used_by_booth_nama || k.used_by_admin || 'Tenant Booth'}
                            </p>
                            <p className="text-[10px] text-surface-400 font-mono">
                              {k.used_at ? new Date(k.used_at).toLocaleString('id-ID') : '-'}
                            </p>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteSingleKupon(k.id, k.kode_kupon)}
                          className="p-1.5 hover:bg-danger-500/10 text-surface-400 hover:text-danger-500 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Kupon Ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-surface-200 dark:border-surface-800">
            <div className="flex items-center gap-2 text-xs text-surface-500">
              <span>Tampilkan</span>
              <select
                value={kuponPageSize}
                onChange={(e) => {
                  setKuponPageSize(Number(e.target.value));
                  setKuponCurrentPage(1);
                }}
                className="px-2 py-1 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg outline-none cursor-pointer"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>data per halaman</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={kuponCurrentPage === 1}
                onClick={() => setKuponCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-surface-100 dark:bg-surface-800 rounded-lg text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                Prev
              </button>
              <span className="text-xs font-bold px-2">{kuponCurrentPage} / {Math.max(1, Math.ceil(filteredKupons.length / kuponPageSize))}</span>
              <button
                disabled={kuponCurrentPage >= Math.ceil(filteredKupons.length / kuponPageSize)}
                onClick={() => setKuponCurrentPage(p => p + 1)}
                className="px-3 py-1.5 bg-surface-100 dark:bg-surface-800 rounded-lg text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: AKUN TENANT BOOTH EVENT INI ───────────────── */}
      {activeTab === 'booths' && (
        <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-surface-800">
            <div>
              <h3 className="font-bold text-surface-900 dark:text-white text-base">
                Kredensial Akun Login Tenant Booth Makanan Event {event.nama_event}
              </h3>
              <p className="text-xs text-surface-500">
                Akun tenant booth aktif & dapat login kapan saja di halaman Login Tenant.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {booths.length === 0 ? (
              <div className="col-span-2 py-8 text-center text-surface-400">
                Belum ada booth terdaftar untuk event ini.
              </div>
            ) : (
              booths.map((b) => {
                const countScannedForBooth = kupons.filter(
                  (k) =>
                    k.is_used &&
                    (k.used_by_booth_id === b.id || k.used_by_booth_nama === b.nama_booth)
                ).length;

                return (
                  <div
                    key={b.id}
                    className="p-4 bg-surface-50 dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-surface-900 dark:text-white flex items-center gap-2">
                        <Store className="w-4 h-4 text-accent-500" />
                        {b.nama_booth}
                      </span>
                      <span className="px-2.5 py-0.5 bg-success-500/10 text-success-600 dark:text-success-400 font-mono font-bold rounded-full text-[10px]">
                        {countScannedForBooth || b.total_scanned || 0} Scanned
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-white dark:bg-surface-900 p-3 rounded-xl border border-surface-200/50 dark:border-surface-700/50 font-mono">
                      <div>
                        <span className="text-[10px] text-surface-400 block font-sans">Username Login</span>
                        <span className="font-bold text-primary-600 dark:text-primary-400">{b.username}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-surface-400 block font-sans">Password Login</span>
                        <span className="font-bold text-accent-600 dark:text-accent-400">{b.password}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-surface-200 dark:border-surface-700 mt-2">
                      <div className="flex flex-col gap-2 w-full">
                        {editingBoothId === b.id ? (
                          <div className="space-y-2 mt-2 w-full">
                            <span className="text-[10px] text-surface-500 font-semibold block mb-1">Pilih Kategori Kupon:</span>
                            {event?.rules?.categories?.map((cat) => (
                              <label key={cat.id} className="flex items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={editBoothCategories.includes(cat.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEditBoothCategories((prev) => [...prev, cat.id]);
                                    } else {
                                      setEditBoothCategories((prev) => prev.filter((id) => id !== cat.id));
                                    }
                                  }}
                                  className="w-3.5 h-3.5 text-primary-500 rounded border-surface-300 focus:ring-primary-500"
                                />
                                {cat.nama_kategori}
                              </label>
                            ))}
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={handleSaveBoothCategories}
                                disabled={isSavingBooth}
                                className="px-3 py-1 bg-primary-600 hover:bg-primary-500 text-white rounded text-xs font-bold transition-colors disabled:opacity-50"
                              >
                                {isSavingBooth ? 'Menyimpan...' : 'Simpan'}
                              </button>
                              <button
                                onClick={() => setEditingBoothId(null)}
                                className="px-3 py-1 bg-surface-200 dark:bg-surface-700 hover:bg-surface-300 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-200 rounded text-xs font-bold transition-colors"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between w-full pt-1">
                            <div className="flex flex-wrap gap-1">
                              {b.allowed_categories && b.allowed_categories.length > 0 ? (
                                b.allowed_categories.map((catId) => {
                                  const cat = event?.rules?.categories?.find((c) => c.id === catId);
                                  return (
                                    <span key={catId} className="px-1.5 py-0.5 bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-md text-[9px] font-bold border border-primary-500/20">
                                      {cat ? cat.nama_kategori : 'Kupon Valid'}
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-800 text-surface-500 rounded-md text-[9px] font-bold border border-surface-200 dark:border-surface-700">
                                  Semua Akses (Tidak Dibatasi)
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2 items-center">
                               <button
                                 onClick={() => handleEditBoothClick(b)}
                                 className="px-2 py-0.5 bg-accent-500/10 text-accent-600 dark:text-accent-400 font-bold rounded text-[10px] uppercase cursor-pointer hover:bg-accent-500/20"
                               >
                                 Edit Akses
                               </button>
                               <span className="px-2 py-0.5 bg-success-500/10 text-success-600 dark:text-success-400 font-bold rounded text-[10px] uppercase ml-1">
                                 🟢 AKTIF
                               </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: LAPORAN PENUKARAN PER BOOTH ───────────────── */}
      {activeTab === 'reports' && boothReport && (
        <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-surface-800">
            <div>
              <h3 className="font-bold text-surface-900 dark:text-white text-base">
                Laporan Real-Time Penukaran Kupon Event {event.nama_event}
              </h3>
              <p className="text-xs text-surface-500">
                Statistik klaim makanan & penukaran kupon di lokasi acara per tenant booth.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-2xl">
              <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 block">Total Kupon Terbit</span>
              <span className="text-2xl font-extrabold text-primary-700 dark:text-primary-300">{boothReport.totalEventKupons}</span>
            </div>
            <div className="p-4 bg-danger-500/10 border border-danger-500/20 rounded-2xl">
              <span className="text-xs font-semibold text-danger-600 dark:text-danger-400 block">Sudah Ditukarkan</span>
              <span className="text-2xl font-extrabold text-danger-700 dark:text-danger-300">{boothReport.totalUsedKupons}</span>
            </div>
            <div className="p-4 bg-success-500/10 border border-success-500/20 rounded-2xl">
              <span className="text-xs font-semibold text-success-600 dark:text-success-400 block">Belum Ditukarkan</span>
              <span className="text-2xl font-extrabold text-success-700 dark:text-success-300">{boothReport.totalUnusedKupons}</span>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-sm text-surface-900 dark:text-white">Rincian Per Booth:</h4>
            {boothReport.boothStats.map((st) => (
              <div key={st.booth.id} className="p-4 bg-surface-50 dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-surface-900 dark:text-white flex items-center gap-2">
                    <Store className="w-4 h-4 text-accent-500" />
                    {st.booth.nama_booth} ({st.booth.username})
                  </span>
                  <span className="font-bold text-primary-600 dark:text-primary-400 font-mono">
                    {st.countScanned} Kupon ({st.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-surface-200 dark:bg-surface-700 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-primary-500 to-accent-500 h-full rounded-full transition-all"
                    style={{ width: `${st.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: SCANNER QR VERIFIKASI ────────────────────── */}
      {activeTab === 'scan' && (
        <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 p-6 shadow-sm space-y-6 max-w-lg mx-auto">
          <div className="text-center space-y-1">
            <QrCode className="w-10 h-10 text-primary-500 mx-auto" />
            <h3 className="font-bold text-base text-surface-900 dark:text-white">Verifikasi Scanner Kupon Lapangan</h3>
            <p className="text-xs text-surface-500">Masukkan atau scan Kode Kupon Warga untuk verifikasi klaim.</p>
          </div>

          <form onSubmit={handleScanSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1 text-surface-700 dark:text-surface-200">
                Kode Kupon Warga
              </label>
              <input
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Contoh: MTNR11-A8F3K9L2"
                required
                className="w-full px-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-2xl text-center font-mono font-bold text-sm tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white font-bold rounded-2xl shadow-lg cursor-pointer text-xs"
            >
              Verifikasi & Tukarkan Kupon
            </button>
          </form>

          <div className="pt-4 mt-4 border-t border-surface-200 dark:border-surface-700">
            <button
              type="button"
              onClick={() => setShowCamera(!showCamera)}
              className="w-full py-2.5 bg-surface-200 dark:bg-surface-700 hover:bg-surface-300 dark:hover:bg-surface-600 text-surface-900 dark:text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              {showCamera ? 'Tutup Kamera' : 'Buka Kamera HP'}
            </button>
          </div>
          
          {showCamera && (
            <div className="mt-4 rounded-2xl overflow-hidden shadow-2xl ring-2 ring-primary-500/50">
              <Scanner
                onScan={(detectedCodes) => {
                  if (detectedCodes.length > 0) {
                    const code = detectedCodes[0].rawValue;
                    if (code) {
                      setShowCamera(false);
                      processScan(code);
                    }
                  }
                }}
                onError={(error) => {
                  console.error(error);
                }}
                constraints={{ facingMode: 'environment' }}
              />
            </div>
          )}

          {scanResult && (
            <div
              className={`p-4 rounded-2xl border text-center text-xs font-semibold animate-fade-in ${
                scanResult.success
                  ? 'bg-success-500/10 border-success-500/30 text-success-600 dark:text-success-400'
                  : 'bg-danger-500/10 border-danger-500/30 text-danger-500'
              }`}
            >
              {scanResult.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
