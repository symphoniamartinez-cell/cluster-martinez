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
  Trash2,
} from 'lucide-react';
import type { EventAcara, KuponAcara, UserRole, TenantBooth } from '@/types';
import { clearAllEventsAndKuponsCloud } from '@/lib/db-sync';
import {
  getEventsFromStorage,
  getKuponsFromStorage,
  getBoothsFromStorage,
  scanAndUseKupon,
  addManualKupon,
  getBoothReportForEvent,
  DEFAULT_RULES,
  deleteEvent,
  deleteKupon,
  syncEventDataFromCloud,
  fetchAllEventsFromCloud,
  updateBoothCategories,
} from '@/lib/event-store';

export default function AdminEventsPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'events' | 'reports' | 'scan' | 'kupons' | 'booths'>('events');
  const [userRole, setUserRole] = useState<UserRole>('superadmin');
  const [userName, setUserName] = useState('Admin');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTab = sessionStorage.getItem('admin_events_active_tab');
      if (savedTab) {
        setActiveTab(savedTab as any);
      }
    }
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as any);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('admin_events_active_tab', tab);
    }
  };
  const [events, setEvents] = useState<EventAcara[]>([]);
  const [kupons, setKupons] = useState<KuponAcara[]>([]);
  const [booths, setBooths] = useState<TenantBooth[]>([]);

  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Scan Form State
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    kupon?: KuponAcara;
  } | null>(null);


  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [kuponSearch, setKuponSearch] = useState('');
  const [kuponStatusFilter, setKuponStatusFilter] = useState<'all' | 'unused' | 'used'>('all');
  
  // Pagination State
  const [kuponCurrentPage, setKuponCurrentPage] = useState(1);
  const [kuponPageSize, setKuponPageSize] = useState(50);

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
      loadData();
      showToast("Kategori kupon booth berhasil diperbarui!");
    } else {
      alert("Gagal menyimpan kategori booth.");
    }
  };

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
    
    // Fetch all events on mount so it's populated on new devices
    fetchAllEventsFromCloud().then((res) => {
      if (res.success && res.updated) {
        loadData();
      }
    });

    loadData();

    window.addEventListener('focus', loadData);
    window.addEventListener('storage', loadData);

    return () => {
      window.removeEventListener('focus', loadData);
      window.removeEventListener('storage', loadData);
    };
  }, []);

  const handleSyncData = async (eventIdToSync: string, showNotification = true) => {
    if (!eventIdToSync) return;
    setIsSyncing(true);
    const res = await syncEventDataFromCloud(eventIdToSync);
    if (res.success && res.updated) {
      loadData();
      if (showNotification) showToast('Data berhasil disinkronisasi dengan Cloud!');
    } else if (res.success && !res.updated) {
      if (showNotification) showToast('Data sudah versi terbaru.');
    } else {
      if (showNotification) showToast('Gagal sinkronisasi dari Cloud.');
    }
    setIsSyncing(false);
  };

  useEffect(() => {
    if (selectedEventId) {
      handleSyncData(selectedEventId, false);
      setKuponCurrentPage(1); // Reset page on event change
    }
  }, [selectedEventId]);

  // Real-Time Booth Report Calculation
  const boothReport = useMemo(() => {
    if (!selectedEventId) return null;
    return getBoothReportForEvent(selectedEventId);
  }, [selectedEventId, kupons, booths]);


  // Handle Delete Event
  const handleDeleteEvent = async (eventId: string, eventName: string) => {
    if (
      confirm(
        `Apakah Anda yakin ingin menghapus Event "${eventName}"?\n\nSemua data kupon warga dan akun booth tenant yang terasosiasi dengan event ini akan ikut terhapus.`
      )
    ) {
      await deleteEvent(eventId);
      if (selectedEventId === eventId) {
        setSelectedEventId('');
      }
      loadData();
      showToast(`Event "${eventName}" beserta kupon & booth berhasil dihapus.`);
    }
  };

  // Handle Delete Single Kupon
  const handleDeleteKupon = async (kuponId: string, kodeKupon: string) => {
    if (confirm(`Yakin ingin menghapus kupon "${kodeKupon}" secara permanen?`)) {
      await deleteKupon(kuponId);
      loadData();
      showToast(`Kupon "${kodeKupon}" berhasil dihapus.`);
    }
  };

  // Handle Scan Kupon
  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    const res = await scanAndUseKupon(scanInput, userName);
    setScanResult(res);
    setScanInput('');
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

  // Reset pagination when filter changes
  useEffect(() => {
    setKuponCurrentPage(1);
  }, [kuponSearch, kuponStatusFilter, kuponPageSize]);

  // Apply Pagination
  const paginatedKupons = useMemo(() => {
    const startIndex = (kuponCurrentPage - 1) * kuponPageSize;
    return filteredKupons.slice(startIndex, startIndex + kuponPageSize);
  }, [filteredKupons, kuponCurrentPage, kuponPageSize]);

  // Handle Clear All Events & Database Wipe
  const handleClearAllEvents = async () => {
    if (
      confirm(
        'Apakah Anda yakin ingin MENGHAPUS SEMUA EVENT, KUPON & TENANT BOOTH dari peramban dan Cloud Database Supabase?'
      )
    ) {
      localStorage.removeItem('martinez_events_v1');
      localStorage.removeItem('martinez_kupons_v1');
      localStorage.removeItem('martinez_booths_v1');
      await clearAllEventsAndKuponsCloud();
      loadData();
      showToast('✨ Seluruh data event, kupon, dan tenant booth telah dibersihkan!');
    }
  };

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
          {events.length > 0 && (
            <button
              onClick={handleClearAllEvents}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-danger-500/10 hover:bg-danger-500/20 text-danger-600 dark:text-danger-400 font-bold text-xs rounded-xl border border-danger-500/20 transition-all cursor-pointer"
              title="Hapus seluruh event & kupon di database"
            >
              <Trash2 className="w-4 h-4 text-danger-500" />
              Bersihkan Semua Event
            </button>
          )}

          {/* Sync Cloud Button */}
          {selectedEventId && (
            <button
              onClick={() => handleSyncData(selectedEventId)}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-xl shadow-sm transition-all border ${
                isSyncing
                  ? 'bg-surface-100 dark:bg-surface-800 text-surface-400 border-surface-200 dark:border-surface-700 cursor-not-allowed'
                  : 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 hover:bg-primary-50 dark:hover:bg-surface-700 text-primary-600 dark:text-primary-400 cursor-pointer'
              }`}
              title="Tarik data penukaran terbaru dari Cloud"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Menyinkronkan...' : 'Sync Cloud'}
            </button>
          )}

          {/* Manual Coupon Button */}
          <button
            onClick={() => router.push(selectedEventId ? `/admin/events/tambah-kupon?eventId=${selectedEventId}` : '/admin/events/tambah-kupon')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
            title="Tambah Kupon Manual untuk koreksi kesalahan data lapangan"
          >
            <PlusCircle className="w-4 h-4 text-accent-500" />
            Kupon Manual Lapangan
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
          onClick={() => handleTabChange('events')}
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
          onClick={() => handleTabChange('reports')}
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
          onClick={() => handleTabChange('booths')}
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
          Akun Tenant Booth ({booths.filter(b => b.event_id === selectedEventId).length})
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('kupons')}
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
          Semua Kupon Warga ({kupons.filter(k => k.event_id === selectedEventId).length})
        </button>
      </div>

      {/* ── TAB 1: DAFTAR EVENT ─────────────────────────────── */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          {events.length === 0 ? (
            <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 p-12 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-accent-500/10 text-accent-500 flex items-center justify-center mx-auto">
                <Ticket className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="font-bold text-surface-900 dark:text-white text-base">
                  Belum Ada Event & Kupon
                </h3>
                <p className="text-xs text-surface-500 mt-1 leading-relaxed">
                  Belum ada event acara yang diterbitkan. Silakan buat event baru untuk menerbitkan kupon warga dan akun tenant booth makanan.
                </p>
              </div>
              <button
                onClick={() => router.push('/admin/events/create')}
                className="px-6 py-3 bg-gradient-to-r from-accent-500 to-primary-500 text-white font-bold text-xs rounded-xl shadow-lg hover:brightness-110 transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Buat Event Baru
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-surface-400">
                            {evt.tanggal_event}
                          </span>
                          <button
                            onClick={() => handleDeleteEvent(evt.id, evt.nama_event)}
                            className="p-1.5 text-danger-500 hover:bg-danger-500/10 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-danger-500/20"
                            title="Hapus Event Ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-surface-900 dark:text-white text-base">
                          {evt.nama_event}
                        </h3>
                        <button
                          onClick={() => router.push(`/admin/events/${evt.id}`)}
                          className="px-3 py-1 bg-primary-500/10 hover:bg-primary-500/20 text-primary-600 dark:text-primary-400 font-bold text-[11px] rounded-xl transition-all cursor-pointer"
                        >
                          Detail Page &rarr;
                        </button>
                      </div>

                      <p className="text-xs text-surface-500 mb-4 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-accent-500" />
                        {evt.lokasi_event}
                      </p>


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

                    <div className="space-y-2 pt-3 border-t border-surface-100 dark:border-surface-800">
                      <div className="grid grid-cols-4 gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedEventId(evt.id);
                            handleTabChange('reports');
                          }}
                          className="py-2 px-2 bg-gradient-to-r from-accent-500 to-primary-500 hover:from-accent-600 hover:to-primary-600 text-white font-bold text-[11px] rounded-xl shadow-sm transition-all cursor-pointer text-center flex items-center justify-center gap-1"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          Laporan
                        </button>

                        <button
                          onClick={() => {
                            setSelectedEventId(evt.id);
                            handleTabChange('booths');
                          }}
                          className="py-2 px-2 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 font-bold text-[11px] rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1"
                        >
                          <Store className="w-3.5 h-3.5 text-accent-500" />
                          Booth ({boothCountForEvt})
                        </button>

                        <button
                          onClick={() => {
                            setSelectedEventId(evt.id);
                            handleTabChange('kupons');
                          }}
                          className="py-2 px-2 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 font-bold text-[11px] rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1"
                        >
                          <Ticket className="w-3.5 h-3.5 text-primary-500" />
                          Kupon ({countKuponsForEvt})
                        </button>

                        <button
                          onClick={() => {
                            setSelectedEventId(evt.id);
                            router.push('/admin/events/tambah-kupon?eventId=' + evt.id);
                          }}
                          className="py-2 px-2 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 font-bold text-[11px] rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5 text-success-500" />
                          Manual
                        </button>
                      </div>

                      <button
                        onClick={() => handleDeleteEvent(evt.id, evt.nama_event)}
                        className="w-full py-1.5 bg-danger-500/5 hover:bg-danger-500/10 text-danger-600 dark:text-danger-400 font-bold text-[11px] rounded-xl border border-danger-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-danger-500" />
                        Hapus Event Ini
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                  Daftar akun booth untuk event ini. Akun aktif & dapat login kapan saja di halaman Login Tenant.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {booths
                .filter((b) => !selectedEventId || b.event_id === selectedEventId)
                .map((b) => {
                  const countScannedForBooth = kupons.filter(
                    (k) =>
                      k.event_id === b.event_id &&
                      k.is_used &&
                      (k.used_by_booth_id === b.id ||
                        k.used_by_booth_nama === b.nama_booth ||
                        k.used_by_admin === b.nama_booth)
                  ).length;

                  return (
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
                          {countScannedForBooth || b.total_scanned || 0} Scanned
                        </span>
                      </div>
                      
                      {/* Tampilkan Akses Scan Kupon */}
                      <div className="flex flex-col gap-2 mt-1">
                        {editingBoothId === b.id ? (
                          <div className="space-y-2 mt-2 w-full">
                            <span className="text-[10px] text-surface-500 font-semibold block mb-1">Pilih Kategori Kupon:</span>
                            {events.find((e) => e.id === b.event_id)?.rules?.categories?.map((cat) => (
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
                                  const ev = events.find((e) => e.id === b.event_id);
                                  const cat = ev?.rules?.categories?.find((c) => c.id === catId);
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
                            <button
                              onClick={() => handleEditBoothClick(b)}
                              className="px-2 py-0.5 bg-accent-500/10 text-accent-600 dark:text-accent-400 font-bold rounded text-[10px] uppercase cursor-pointer hover:bg-accent-500/20"
                            >
                              Edit Akses
                            </button>
                          </div>
                        )}
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
                  );
                })}
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
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {paginatedKupons.map((k) => (
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
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteKupon(k.id, k.kode_kupon)}
                        className="p-1.5 text-danger-500 hover:bg-danger-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Kupon"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredKupons.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-surface-100 dark:border-surface-800">
              <div className="flex items-center gap-2 text-xs text-surface-500">
                <span>Tampilkan</span>
                <select
                  value={kuponPageSize}
                  onChange={(e) => setKuponPageSize(Number(e.target.value))}
                  className="p-1 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>kupon per halaman</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setKuponCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={kuponCurrentPage === 1}
                  className="px-3 py-1.5 bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 rounded-lg disabled:opacity-50 text-xs font-bold transition-colors cursor-pointer"
                >
                  Prev
                </button>
                <span className="text-xs font-bold px-2">
                  {kuponCurrentPage} / {Math.max(1, Math.ceil(filteredKupons.length / kuponPageSize))}
                </span>
                <button
                  onClick={() => setKuponCurrentPage((p) => p + 1)}
                  disabled={kuponCurrentPage >= Math.ceil(filteredKupons.length / kuponPageSize)}
                  className="px-3 py-1.5 bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 rounded-lg disabled:opacity-50 text-xs font-bold transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
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
    </div>
  );
}
