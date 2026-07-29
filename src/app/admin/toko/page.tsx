'use client';

// ============================================================
// Admin Toko Martinez Page — /admin/toko
// Manajemen Master Barang & Input Pembelian (Stok Gudang)
// ============================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  Store,
  Package,
  PlusCircle,
  Check,
  RefreshCw,
  Box,
  ShoppingCart,
  Trash2,
  TrendingUp,
  X,
  History,
  PieChart,
  Pencil,
  Settings,
  AlertTriangle,
  Download,
} from 'lucide-react';
import TokoAnalisisTab from '@/components/TokoAnalisisTab';
import type { TokoBarang, TokoPergerakanStok, TokoPenjualan } from '@/types';
import {
  getTokoBarangLocal,
  getTokoPergerakanLocal,
  getTokoPenjualanLocal,
  syncTokoDataFromCloud,
  deleteTokoBarang,
  addPembelianBatchGudang,
  keluarkanBatchGudang,
  deletePenjualanInvoice,
  editPenjualanInvoice,
  resetSemuaDataToko,
  deleteMutasiStok,
  deletePembelianInvoice,
  editPembelianInvoice,
  type PembelianItem,
  type KeluarkanItem,
} from '@/lib/toko-store';

export default function AdminTokoPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'analisis' | 'master' | 'pembelian' | 'mutasi' | 'riwayat' | 'laba_rugi' | 'pengaturan'>('analisis');
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');

  const [barangList, setBarangList] = useState<TokoBarang[]>([]);
  const [pergerakanList, setPergerakanList] = useState<TokoPergerakanStok[]>([]);
  const [penjualanList, setPenjualanList] = useState<TokoPenjualan[]>([]);

  // ── MODAL STATES ──
  const [showModalBeli, setShowModalBeli] = useState(false);
  const [beliForm, setBeliForm] = useState<{
    nomor_invoice: string;
    tanggal: string;
    catatan: string;
    items: PembelianItem[];
  }>({
    nomor_invoice: '',
    tanggal: new Date().toISOString().slice(0, 10),
    catatan: '',
    items: [],
  });

  const [showModalEditBeli, setShowModalEditBeli] = useState(false);
  const [editBeliForm, setEditBeliForm] = useState<{
    nomor_invoice: string;
    tanggal: string;
    catatan: string;
    items: PembelianItem[];
  }>({
    nomor_invoice: '',
    tanggal: new Date().toISOString().slice(0, 10),
    catatan: '',
    items: [],
  });

  const [showModalKeluarkan, setShowModalKeluarkan] = useState(false);
  const [keluarForm, setKeluarForm] = useState<{
    catatan: string;
    items: KeluarkanItem[];
  }>({
    catatan: '',
    items: [],
  });

  const [searchInvoice, setSearchInvoice] = useState('');
  const [detailInvoice, setDetailInvoice] = useState<{
    nomor_invoice: string;
    tanggal: string;
    dibuat_oleh: string;
    catatan: string;
    items: TokoPergerakanStok[];
  } | null>(null);

  const [searchRiwayat, setSearchRiwayat] = useState('');
  const [detailRiwayat, setDetailRiwayat] = useState<{
    nomor_invoice: string;
    tanggal: string;
    nama_pelanggan: string;
    dijual_oleh: string;
    items: TokoPenjualan[];
  } | null>(null);

  const [editRiwayat, setEditRiwayat] = useState<{
    nomor_invoice: string;
    nama_pelanggan: string;
    items: {
      barang_id: string;
      jumlah_satuan_kecil: number;
      harga_satuan_custom: number;
    }[];
  } | null>(null);

  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = () => {
    setBarangList(getTokoBarangLocal());
    setPergerakanList(getTokoPergerakanLocal());
    setPenjualanList(getTokoPenjualanLocal());
  };

  const handleSyncData = async (showNotification = true) => {
    setIsSyncing(true);
    const res = await syncTokoDataFromCloud();
    if (res.success) {
      loadData();
      if (showNotification) showToast('Data berhasil disinkronisasi dengan Cloud!');
    } else {
      if (showNotification) showToast(`Gagal sinkronisasi: ${res.error}`);
    }
    setIsSyncing(false);
  };

  useEffect(() => {
    loadData();
    handleSyncData(false); // Initial background sync
    
    // Check user role
    const sessionStr = sessionStorage.getItem('demo_user');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        setUserRole(session.role || '');
      } catch (e) {}
    }
  }, []);

  // ── HANDLERS ──
  const handleDeleteBarang = async (id: string, nama: string) => {
    if (confirm(`Yakin ingin menghapus barang "${nama}"? Semua riwayat stok akan terhapus juga!`)) {
      const res = await deleteTokoBarang(id);
      if (res.success) {
        showToast('Barang berhasil dihapus!');
        loadData();
      } else {
        showToast(`Gagal menghapus: ${res.error}`);
      }
    }
  };

  const handleSimpanPembelian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (beliForm.items.length === 0) return;

    const user = JSON.parse(sessionStorage.getItem('demo_user') || '{}').label || 'Admin';
    const res = await addPembelianBatchGudang(
      beliForm.items,
      beliForm.nomor_invoice,
      beliForm.tanggal,
      beliForm.catatan,
      user
    );

    if (res.success) {
      showToast('Pembelian berhasil ditambahkan ke Gudang!');
      setShowModalBeli(false);
      loadData();
    } else {
      showToast(`Gagal menambah pembelian: ${res.error}`);
    }
  };

  const handleSimpanKeluarkan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (keluarForm.items.length === 0) return;

    const user = JSON.parse(sessionStorage.getItem('demo_user') || '{}').label || 'Admin';
    const res = await keluarkanBatchGudang(
      keluarForm.items,
      keluarForm.catatan,
      user
    );

    if (res.success) {
      showToast('Stok berhasil dikeluarkan dari Gudang!');
      setShowModalKeluarkan(false);
      loadData();
    } else {
      showToast(`Gagal mengeluarkan stok: ${res.error}`);
    }
  };

  const handleDeleteRiwayat = async (nomorInvoice: string) => {
    if (!confirm(`Hapus Invoice ${nomorInvoice} dan retur stok barang ke etalase?`)) return;
    setIsSyncing(true);
    const res = await deletePenjualanInvoice(nomorInvoice);
    if (res.success) {
      showToast('Riwayat penjualan berhasil dihapus!');
      loadData();
    } else {
      showToast(`Gagal menghapus: ${res.error}`);
    }
    setIsSyncing(false);
  };

  const handleSimpanEditRiwayat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRiwayat) return;

    setIsSyncing(true);
    const user = JSON.parse(sessionStorage.getItem('demo_user') || '{}').label || 'Admin';
    const res = await editPenjualanInvoice(
      editRiwayat.nomor_invoice,
      editRiwayat.items.map(i => ({ 
        barang_id: i.barang_id, 
        jumlah_satuan_kecil: i.jumlah_satuan_kecil, 
        harga_satuan_custom: i.harga_satuan_custom 
      })),
      editRiwayat.nama_pelanggan,
      user
    );

    if (res.success) {
      showToast('Invoice penjualan berhasil diperbarui!');
      setEditRiwayat(null);
      loadData();
    } else {
      showToast(`Gagal mengedit invoice: ${res.error}`);
    }
    setIsSyncing(false);
  };

  const handleDeletePembelian = async (nomorInvoice: string) => {
    if (!confirm(`Hapus seluruh riwayat pembelian dengan Invoice ${nomorInvoice}? Ini akan mengurangi stok gudang sejumlah barang yang dihapus.`)) return;
    setIsSyncing(true);
    const res = await deletePembelianInvoice(nomorInvoice);
    if (res.success) {
      showToast('Riwayat pembelian berhasil dihapus!');
      loadData();
    } else {
      showToast(`Gagal menghapus pembelian: ${res.error}`);
    }
    setIsSyncing(false);
  };

  const handleDeleteMutasi = async (id: string, jenis: string) => {
    if (!confirm(`Undo riwayat mutasi ini? Stok barang akan dikembalikan ke asal.`)) return;
    setIsSyncing(true);
    const res = await deleteMutasiStok(id);
    if (res.success) {
      showToast('Riwayat mutasi berhasil di-undo!');
      loadData();
    } else {
      showToast(`Gagal melakukan undo mutasi: ${res.error}`);
    }
    setIsSyncing(false);
  };

  const handleSimpanEditPembelian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editBeliForm.items.length === 0) return;

    setIsSyncing(true);
    const user = JSON.parse(sessionStorage.getItem('demo_user') || '{}').label || 'Admin';
    const res = await editPembelianInvoice(
      editBeliForm.nomor_invoice,
      editBeliForm.items,
      editBeliForm.catatan,
      user
    );

    if (res.success) {
      showToast('Invoice pembelian berhasil diperbarui!');
      setShowModalEditBeli(false);
      loadData();
    } else {
      showToast(`Gagal mengedit pembelian: ${res.error}`);
    }
    setIsSyncing(false);
  };

  const downloadExcel = (data: any[], filename: string) => {
    if (data.length === 0) {
      showToast('Tidak ada data untuk diexport');
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  const exportPembelianToExcel = () => {
    const data = filteredPergerakanList
      .filter(p => p.jenis_pergerakan === 'PEMBELIAN_GUDANG')
      .map(p => ({
        'Tanggal': new Date(p.created_at || new Date()).toLocaleString('id-ID'),
        'Nomor Invoice': p.nomor_invoice || 'Tanpa Invoice',
        'Barang': barangList.find(b => b.id === p.barang_id)?.nama_barang || 'Unknown',
        'Qty Masuk': `${p.jumlah_satuan_besar}`,
        'Catatan': p.catatan || '',
        'Dibuat Oleh': p.dibuat_oleh || 'System'
      }));
    downloadExcel(data, `Laporan_Pembelian_${filterMonth}_${filterYear}`);
  };

  const exportMutasiToExcel = () => {
    const data = [
      ...filteredPergerakanList.map(p => ({
        'Waktu': new Date(p.created_at || new Date()).toLocaleString('id-ID'),
        'Barang': barangList.find(b => b.id === p.barang_id)?.nama_barang || 'Unknown',
        'Jenis': p.jenis_pergerakan,
        'Qty': p.jenis_pergerakan === 'PEMBELIAN_GUDANG' 
                ? `+${p.jumlah_satuan_besar}`
                : p.jenis_pergerakan === 'STOK_KELUAR' 
                  ? `-${p.jumlah_satuan_besar}` 
                  : `(Mutasi) ${p.jumlah_satuan_kecil}`,
        'Referensi': p.nomor_invoice || p.catatan || '-',
        'Oleh': p.dibuat_oleh || 'System'
      })),
      ...filteredPenjualanList.map(p => ({
        'Waktu': new Date(p.created_at || new Date()).toLocaleString('id-ID'),
        'Barang': barangList.find(b => b.id === p.barang_id)?.nama_barang || 'Unknown',
        'Jenis': 'TERJUAL',
        'Qty': `-${p.jumlah_satuan_kecil}`,
        'Referensi': p.nomor_invoice || 'Transaksi Kasir',
        'Oleh': p.dijual_oleh || 'System'
      }))
    ].sort((a, b) => new Date(b.Waktu).getTime() - new Date(a.Waktu).getTime());
    downloadExcel(data, `Laporan_Mutasi_${filterMonth}_${filterYear}`);
  };

  const exportPenjualanToExcel = () => {
    const data = filteredPenjualanList.map(p => ({
      'Waktu': new Date(p.created_at || new Date()).toLocaleString('id-ID'),
      'Nomor Invoice': p.nomor_invoice,
      'Pelanggan': p.nama_pelanggan || '-',
      'Barang': barangList.find(b => b.id === p.barang_id)?.nama_barang || 'Unknown',
      'Qty': p.jumlah_satuan_kecil,
      'Harga Satuan': p.harga_satuan,
      'Total Harga': p.total_harga,
      'Kasir': p.dijual_oleh || 'System'
    }));
    downloadExcel(data, `Laporan_Penjualan_${filterMonth}_${filterYear}`);
  };

  const exportLabaRugiToExcel = () => {
    const grouped = Object.values(
      filteredPenjualanList.reduce((acc, p) => {
        if (!acc[p.barang_id]) {
          acc[p.barang_id] = { 
            barang_id: p.barang_id, 
            qty: 0, 
            omzet: 0, 
            hpp: 0 
          };
        }
        acc[p.barang_id].qty += p.jumlah_satuan_kecil;
        acc[p.barang_id].omzet += p.total_harga;
        acc[p.barang_id].hpp += (p.harga_modal_satuan || 0) * p.jumlah_satuan_kecil;
        return acc;
      }, {} as Record<string, any>)
    );

    const data = grouped.map(g => ({
      'Barang': barangList.find(b => b.id === g.barang_id)?.nama_barang || 'Unknown',
      'Terjual': g.qty,
      'Omzet': g.omzet,
      'HPP': g.hpp,
      'Profit': g.omzet - g.hpp
    }));
    
    const totalOmzet = grouped.reduce((sum, g) => sum + g.omzet, 0);
    const totalHPP = grouped.reduce((sum, g) => sum + g.hpp, 0);
    data.push({
      'Barang': 'TOTAL KESELURUHAN',
      'Terjual': grouped.reduce((sum, g) => sum + g.qty, 0),
      'Omzet': totalOmzet,
      'HPP': totalHPP,
      'Profit': totalOmzet - totalHPP
    });

    downloadExcel(data, `Laporan_LabaRugi_${filterMonth}_${filterYear}`);
  };

  const [isResetting, setIsResetting] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(0);

  const startResetCountdown = () => {
    if (resetCountdown > 0) return;
    setResetCountdown(5);
    const timer = setInterval(() => {
      setResetCountdown((prev) => {
        if (prev <= 2) {
          clearInterval(timer);
          return 1;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const executeReset = async () => {
    setIsResetting(true);
    const res = await resetSemuaDataToko();
    if (res.success) {
      showToast('Seluruh riwayat transaksi berhasil dihapus & stok di-reset ke 0!');
      loadData();
      setResetCountdown(0);
    } else {
      showToast(`Gagal mereset data: ${res.error}`);
    }
    setIsResetting(false);
  };

  const filteredPergerakanList = pergerakanList.filter(p => {
    const d = new Date(p.created_at || new Date());
    return (d.getMonth() + 1) === filterMonth && d.getFullYear() === filterYear;
  });

  const filteredPenjualanList = penjualanList.filter(p => {
    const d = new Date(p.created_at || new Date());
    return (d.getMonth() + 1) === filterMonth && d.getFullYear() === filterYear;
  });

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
          <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/20">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-surface-900 dark:text-white">
              Gudang Toko Martinez
            </h1>
            <p className="text-sm text-surface-700/60 dark:text-surface-200/50 mt-0.5">
              Manajemen Master Barang & Input Pembelian (Stok Gudang)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSyncData(true)}
            disabled={isSyncing}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-xl shadow-sm transition-all border ${
              isSyncing
                ? 'bg-surface-100 dark:bg-surface-800 text-surface-400 border-surface-200 dark:border-surface-700 cursor-not-allowed'
                : 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 hover:bg-primary-50 dark:hover:bg-surface-700 text-primary-600 dark:text-primary-400 cursor-pointer'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Cloud'}
          </button>

          <button
            onClick={() => {
              router.push('/admin/toko/barang');
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-500/25 hover:brightness-110 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Barang Baru
          </button>
        </div>
      </div>

      {/* ── Tabs Navigation & Filters ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-surface-100/50 dark:bg-surface-800/50 p-1.5 rounded-2xl w-fit flex-wrap">
          <button
            onClick={() => setActiveTab('analisis')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'analisis'
                ? 'bg-white dark:bg-surface-900 text-amber-600 dark:text-amber-400 shadow-sm border border-surface-200/50 dark:border-surface-700/50'
                : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Analisis Barang
          </button>
          <button
          onClick={() => setActiveTab('master')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'master'
              ? 'bg-white dark:bg-surface-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-surface-200/50 dark:border-surface-700/50'
              : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
          }`}
        >
          <Package className="w-4 h-4" />
          Master Barang
        </button>
        <button
          onClick={() => setActiveTab('pembelian')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'pembelian'
              ? 'bg-white dark:bg-surface-900 text-purple-600 dark:text-purple-400 shadow-sm border border-surface-200/50 dark:border-surface-700/50'
              : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          Restock Pembelian
        </button>
        <button
          onClick={() => setActiveTab('mutasi')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'mutasi'
              ? 'bg-white dark:bg-surface-900 text-blue-600 dark:text-blue-400 shadow-sm border border-surface-200/50 dark:border-surface-700/50'
              : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          Riwayat Mutasi
        </button>
        <button
          onClick={() => setActiveTab('riwayat')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'riwayat'
              ? 'bg-white dark:bg-surface-900 text-teal-600 dark:text-teal-400 shadow-sm border border-surface-200/50 dark:border-surface-700/50'
              : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
          }`}
        >
          <History className="w-4 h-4" />
          Riwayat Penjualan
        </button>
        <button
          onClick={() => setActiveTab('laba_rugi')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'laba_rugi'
              ? 'bg-white dark:bg-surface-900 text-rose-600 dark:text-rose-400 shadow-sm border border-surface-200/50 dark:border-surface-700/50'
              : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
          }`}
        >
          <PieChart className="w-4 h-4" />
          Laba Rugi
        </button>
        {userRole === 'superadmin' && (
          <button
            onClick={() => setActiveTab('pengaturan')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'pengaturan'
                ? 'bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-400 shadow-sm border border-danger-200/50 dark:border-danger-700/50'
                : 'text-surface-500 hover:text-danger-600 dark:hover:text-danger-400'
            }`}
          >
            <Settings className="w-4 h-4" />
            Pengaturan
          </button>
        )}
        </div>

        {activeTab !== 'master' && (
          <div className="flex items-center gap-2">
            <select 
              value={filterMonth}
              onChange={e => setFilterMonth(Number(e.target.value))}
              className="px-4 py-2.5 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs font-bold shadow-sm outline-none cursor-pointer"
            >
              {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('id-ID', { month: 'long' })}</option>
              ))}
            </select>
            <select
              value={filterYear}
              onChange={e => setFilterYear(Number(e.target.value))}
              className="px-4 py-2.5 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs font-bold shadow-sm outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 🟢 TAB CONTENT: ANALISIS 🟢 */}
      {activeTab === 'analisis' && (
        <TokoAnalisisTab 
          penjualanList={filteredPenjualanList} 
          barangList={barangList} 
          filterMonth={filterMonth}
          filterYear={filterYear}
        />
      )}

      {/* ── TAB CONTENT: MASTER BARANG ───────────────────────── */}
      {activeTab === 'master' && (
        <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-700 text-surface-500 uppercase tracking-wider font-semibold">
                  <th className="px-5 py-4">Nama Barang</th>
                  <th className="px-5 py-4">Satuan Beli (Gudang)</th>
                  <th className="px-5 py-4">Satuan Jual (Display)</th>
                  <th className="px-5 py-4">Harga Beli / Besar</th>
                  <th className="px-5 py-4">Harga Jual / Kecil</th>
                  <th className="px-5 py-4">Stok Gudang</th>
                  <th className="px-5 py-4">Stok Display</th>
                  <th className="px-5 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {barangList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-surface-400">
                      Belum ada Master Barang. Klik "Barang Baru" untuk menambahkan.
                    </td>
                  </tr>
                ) : (
                  barangList.map((b) => (
                    <tr key={b.id} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/50 transition-colors">
                      <td className="px-5 py-3 font-bold text-surface-900 dark:text-white">
                        {b.nama_barang}
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-semibold text-primary-600 dark:text-primary-400">{b.satuan_besar}</span>
                        <span className="text-surface-400 text-[10px] ml-1">(Isi: {b.qty_per_satuan_besar})</span>
                      </td>
                      <td className="px-5 py-3 font-semibold text-accent-600 dark:text-accent-400">
                        {b.satuan_kecil}
                      </td>
                      <td className="px-5 py-3 font-mono text-surface-600 dark:text-surface-300">
                        Rp {b.harga_beli_satuan_besar.toLocaleString('id-ID')}
                      </td>
                      <td className="px-5 py-3 font-mono text-surface-600 dark:text-surface-300">
                        Rp {b.harga_jual_satuan_kecil.toLocaleString('id-ID')}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">
                          {b.stok_gudang} {b.satuan_kecil}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold">
                          {b.stok_display} {b.satuan_kecil}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              router.push(`/admin/toko/barang?id=${b.id}`);
                            }}
                            className="p-1.5 text-primary-500 hover:bg-primary-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Edit Barang"
                          >
                            <TrendingUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBarang(b.id, b.nama_barang)}
                            className="p-1.5 text-danger-500 hover:bg-danger-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Barang"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: PEMBELIAN ──────────────────────────── */}
      {activeTab === 'pembelian' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl shadow-indigo-500/20">
            <div>
              <h2 className="text-lg sm:text-xl font-bold mb-2 flex items-center gap-2">
                <Box className="w-5 h-5" />
                Input Pembelian & Pengeluaran Gudang
              </h2>
              <p className="text-white/80 text-sm max-w-xl leading-relaxed">
                Catat barang yang masuk (Beli) atau keluar (Event/Sumbangan). Input dalam satuan Dus akan terkonversi otomatis ke Botol/Pcs.
              </p>
            </div>
            <div className="flex-shrink-0 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setKeluarForm({ 
                    catatan: '',
                    items: [{
                      barang_id: barangList[0]?.id || '',
                      jumlah_satuan_besar: 1
                    }]
                  });
                  setShowModalKeluarkan(true);
                }}
                className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap border border-white/20"
              >
                - Keluarkan Stok
              </button>
              <button
                onClick={() => {
                  setBeliForm({ 
                    nomor_invoice: '',
                    tanggal: new Date().toISOString().slice(0, 10),
                    catatan: '',
                    items: [{
                      barang_id: barangList[0]?.id || '',
                      jumlah_satuan_besar: 1,
                      harga_beli_satuan_besar: barangList[0]?.harga_beli_satuan_besar || 0
                    }]
                  });
                  setShowModalBeli(true);
                }}
                className="px-5 py-2.5 bg-white text-indigo-600 hover:bg-indigo-50 font-bold rounded-xl shadow-lg transition-all cursor-pointer whitespace-nowrap"
              >
                + Input Pembelian
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h3 className="font-bold text-sm text-surface-900 dark:text-white">Riwayat Pembelian Gudang Terakhir</h3>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={exportPembelianToExcel}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 font-bold rounded-xl text-xs hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Excel
                </button>
                <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Cari Nomor Invoice..."
                  value={searchInvoice}
                  onChange={e => setSearchInvoice(e.target.value)}
                  className="w-full px-4 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
            </div>
          </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-700 text-surface-500 uppercase tracking-wider font-semibold">
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Nomor Invoice</th>
                    <th className="px-4 py-3 text-center">Macam Barang</th>
                    <th className="px-4 py-3">Dibuat Oleh</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                  {filteredPergerakanList.filter(p => p.jenis_pergerakan === 'PEMBELIAN_GUDANG').length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-surface-400">Belum ada riwayat pembelian di bulan ini.</td>
                    </tr>
                  ) : (
                    Object.values(
                      filteredPergerakanList
                        .filter(p => p.jenis_pergerakan === 'PEMBELIAN_GUDANG')
                        .reduce((acc, p) => {
                          const key = p.nomor_invoice || `legacy-${p.id}`;
                          if (!acc[key]) {
                            acc[key] = {
                              nomor_invoice: p.nomor_invoice || 'Tanpa Invoice (Lama)',
                              tanggal: p.created_at || new Date().toISOString(),
                              dibuat_oleh: p.dibuat_oleh || 'System',
                              catatan: p.catatan || '',
                              items: []
                            };
                          }
                          acc[key].items.push(p);
                          return acc;
                        }, {} as Record<string, { nomor_invoice: string; tanggal: string; dibuat_oleh: string; catatan: string; items: TokoPergerakanStok[] }>)
                    )
                    .filter(invoice => 
                      !searchInvoice || 
                      invoice.nomor_invoice.toLowerCase().includes(searchInvoice.toLowerCase())
                    )
                    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
                    .slice(0, 50)
                    .map((invoice, idx) => (
                      <tr key={idx} className="hover:bg-surface-50 dark:hover:bg-surface-800/50">
                        <td className="px-4 py-3 font-medium text-surface-900 dark:text-white">
                          {new Date(invoice.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline" onClick={() => setDetailInvoice(invoice)}>
                          {invoice.nomor_invoice}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-surface-100 dark:bg-surface-800 rounded-lg text-[10px] font-bold">
                            {invoice.items.length} Item
                          </span>
                        </td>
                        <td className="px-4 py-3 text-surface-500">
                          {invoice.dibuat_oleh}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setDetailInvoice(invoice)}
                              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 font-bold rounded-lg transition-colors"
                            >
                              Detail
                            </button>
                            <button
                              onClick={() => {
                                setEditBeliForm({
                                  nomor_invoice: invoice.nomor_invoice,
                                  tanggal: invoice.tanggal.split('T')[0],
                                  catatan: invoice.catatan,
                                  items: invoice.items.map(i => ({
                                    barang_id: i.barang_id,
                                    jumlah_satuan_besar: i.jumlah_satuan_besar || 0,
                                    harga_beli_satuan_besar: 0 // In old data, maybe we don't have this, but not strictly needed for stock update
                                  }))
                                });
                                setShowModalEditBeli(true);
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/20 rounded-lg transition-colors cursor-pointer"
                              title="Edit Pembelian"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePembelian(invoice.nomor_invoice)}
                              className="p-1.5 text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/20 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Pembelian (Kurangi Stok Gudang)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: MUTASI GUDANG ──────────────────────── */}
      {activeTab === 'mutasi' && (
        <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden p-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <h3 className="font-bold text-base text-surface-900 dark:text-white">Riwayat Seluruh Mutasi & Transaksi</h3>
              <p className="text-xs text-surface-500 mt-1">Laporan gabungan pembelian barang masuk, mutasi ke display, stok keluar, dan penjualan kasir.</p>
            </div>
            <button
              onClick={exportMutasiToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 font-bold rounded-xl text-xs hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors w-full sm:w-auto justify-center"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-700 text-surface-500 uppercase tracking-wider font-semibold">
                  <th className="px-4 py-3 whitespace-nowrap">Waktu</th>
                  <th className="px-4 py-3">Nama Barang</th>
                  <th className="px-4 py-3">Jenis Mutasi</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3">Referensi / Catatan</th>
                  <th className="px-4 py-3 whitespace-nowrap">Oleh</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {[
                  ...filteredPergerakanList.map(p => ({
                    id: p.id,
                    tanggal: p.created_at || new Date().toISOString(),
                    barang_id: p.barang_id,
                    jenis: p.jenis_pergerakan,
                    qtyBesar: p.jumlah_satuan_besar || 0,
                    qtyKecil: p.jumlah_satuan_kecil,
                    catatan: p.nomor_invoice || p.catatan || '-',
                    oleh: p.dibuat_oleh || 'System'
                  })),
                  ...filteredPenjualanList.map(p => ({
                    id: p.id,
                    tanggal: p.created_at || new Date().toISOString(),
                    barang_id: p.barang_id,
                    jenis: 'PENJUALAN',
                    qtyBesar: 0,
                    qtyKecil: p.jumlah_satuan_kecil,
                    catatan: 'Transaksi Kasir',
                    oleh: p.dijual_oleh || 'Kasir'
                  }))
                ]
                .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
                .slice(0, 100)
                .map((item, idx) => {
                  const brg = barangList.find(b => b.id === item.barang_id);
                  let jenisStyle = 'text-surface-500 bg-surface-100';
                  let jenisLabel = item.jenis;
                  let qtyStr = '';
                  
                  if (item.jenis === 'PEMBELIAN_GUDANG') {
                    jenisStyle = 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-500/10 dark:border-purple-500/20';
                    jenisLabel = 'BELI MASUK';
                    qtyStr = `+${item.qtyBesar} ${brg?.satuan_besar || 'Dus'}`;
                  } else if (item.jenis === 'STOK_KELUAR') {
                    jenisStyle = 'text-red-600 bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20';
                    jenisLabel = 'STOK KELUAR';
                    qtyStr = `-${item.qtyBesar} ${brg?.satuan_besar || 'Dus'}`;
                  } else if (item.jenis === 'PINDAH_DISPLAY') {
                    jenisStyle = 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20';
                    jenisLabel = 'PINDAH DISPLAY';
                    qtyStr = `(Mutasi) ${item.qtyKecil} ${brg?.satuan_kecil || 'Pcs'}`;
                  } else if (item.jenis === 'PENJUALAN') {
                    jenisStyle = 'text-success-600 bg-success-50 border-success-200 dark:bg-success-500/10 dark:border-success-500/20';
                    jenisLabel = 'TERJUAL';
                    qtyStr = `-${item.qtyKecil} ${brg?.satuan_kecil || 'Pcs'}`;
                  }

                  return (
                    <tr key={`${item.id}-${idx}`} className="hover:bg-surface-50 dark:hover:bg-surface-800/50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-bold text-surface-900 dark:text-white">
                          {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="text-[10px] text-surface-400">
                          {new Date(item.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-surface-900 dark:text-white min-w-[150px]">
                        {brg?.nama_barang || 'Barang Terhapus'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${jenisStyle}`}>
                          {jenisLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold whitespace-nowrap">
                        {qtyStr}
                      </td>
                      <td className="px-4 py-3 text-surface-600 dark:text-surface-400 font-medium">
                        {item.catatan}
                      </td>
                      <td className="px-4 py-3 text-surface-500 whitespace-nowrap">
                        {item.oleh}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(item.jenis === 'STOK_KELUAR' || item.jenis === 'PINDAH_DISPLAY') && (
                          <button
                            onClick={() => handleDeleteMutasi(item.id, item.jenis)}
                            className="p-1.5 text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/20 rounded-lg transition-colors cursor-pointer"
                            title="Undo Mutasi"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {(filteredPergerakanList.length === 0 && filteredPenjualanList.length === 0) && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-surface-400">Belum ada riwayat mutasi / transaksi di bulan ini.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: RIWAYAT PENJUALAN ──────────────────────── */}
      {activeTab === 'riwayat' && (
        <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden p-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <h3 className="font-bold text-base text-surface-900 dark:text-white">Riwayat Penjualan (Struk)</h3>
              <p className="text-xs text-surface-500 mt-1">Laporan penjualan kasir dengan nama pelanggan dan nomor nota.</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={exportPenjualanToExcel}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 font-bold rounded-xl text-xs hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
              >
                <Download className="w-4 h-4" />
                Excel
              </button>
              <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Cari Invoice / Pelanggan..."
                value={searchRiwayat}
                onChange={e => setSearchRiwayat(e.target.value)}
                className="w-full px-4 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              />
            </div>
          </div>
        </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-700 text-surface-500 uppercase tracking-wider font-semibold">
                  <th className="px-4 py-3">Tanggal / Waktu</th>
                  <th className="px-4 py-3">Nomor Invoice</th>
                  <th className="px-4 py-3">Nama Pelanggan</th>
                  <th className="px-4 py-3 text-right">Total Nominal</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {filteredPenjualanList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-surface-400">Belum ada riwayat penjualan di bulan ini.</td>
                  </tr>
                ) : (
                  Object.values(
                    filteredPenjualanList.reduce((acc, p) => {
                      const key = p.nomor_invoice || `legacy-${p.id}`;
                      if (!acc[key]) {
                        acc[key] = {
                          nomor_invoice: p.nomor_invoice || 'Tanpa Invoice (Lama)',
                          tanggal: p.created_at || new Date().toISOString(),
                          nama_pelanggan: p.nama_pelanggan || '-',
                          dijual_oleh: p.dijual_oleh || 'System',
                          items: []
                        };
                      }
                      acc[key].items.push(p);
                      return acc;
                    }, {} as Record<string, { nomor_invoice: string; tanggal: string; nama_pelanggan: string; dijual_oleh: string; items: TokoPenjualan[] }>)
                  )
                  .filter(invoice => 
                    !searchRiwayat || 
                    invoice.nomor_invoice.toLowerCase().includes(searchRiwayat.toLowerCase()) ||
                    invoice.nama_pelanggan.toLowerCase().includes(searchRiwayat.toLowerCase())
                  )
                  .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
                  .slice(0, 100)
                  .map((invoice, idx) => {
                    const totalNominal = invoice.items.reduce((sum, item) => sum + item.total_harga, 0);
                    return (
                      <tr key={idx} className="hover:bg-surface-50 dark:hover:bg-surface-800/50">
                        <td className="px-4 py-3 font-medium text-surface-900 dark:text-white">
                          {new Date(invoice.tanggal).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 font-bold text-teal-600 dark:text-teal-400 cursor-pointer hover:underline" onClick={() => setDetailRiwayat(invoice)}>
                          {invoice.nomor_invoice}
                        </td>
                        <td className="px-4 py-3 text-surface-700 dark:text-surface-300">
                          {invoice.nama_pelanggan}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-success-600 dark:text-success-400">
                          Rp {totalNominal.toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setDetailRiwayat(invoice)}
                              className="px-3 py-1.5 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-500/20 font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              Detail
                            </button>
                            {invoice.nomor_invoice !== 'Tanpa Invoice (Lama)' && (
                              <>
                                <button
                                  onClick={() => setEditRiwayat({
                                    nomor_invoice: invoice.nomor_invoice,
                                    nama_pelanggan: invoice.nama_pelanggan || '',
                                    items: invoice.items.map(i => ({
                                      barang_id: i.barang_id,
                                      jumlah_satuan_kecil: i.jumlah_satuan_kecil,
                                      harga_satuan_custom: i.harga_satuan
                                    }))
                                  })}
                                  className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Invoice"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteRiwayat(invoice.nomor_invoice)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus dan Retur Stok"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: LABA RUGI ──────────────────────── */}
      {activeTab === 'laba_rugi' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-sm p-6">
            <h3 className="font-bold text-base text-surface-900 dark:text-white mb-6">Laporan Laba Rugi Penjualan</h3>
            
            {(() => {
              const totalOmzet = filteredPenjualanList.reduce((sum, p) => sum + p.total_harga, 0);
              const totalHPP = filteredPenjualanList.reduce((sum, p) => sum + ((p.harga_modal_satuan || 0) * p.jumlah_satuan_kecil), 0);
              const totalLaba = totalOmzet - totalHPP;
              const labaMargin = totalOmzet > 0 ? (totalLaba / totalOmzet) * 100 : 0;

              return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl p-5 text-white shadow-lg shadow-indigo-500/20">
                    <p className="text-white/80 text-xs font-semibold uppercase tracking-wider mb-2">Total Omzet</p>
                    <p className="text-3xl font-black font-mono">Rp {totalOmzet.toLocaleString('id-ID')}</p>
                    <p className="text-xs text-white/70 mt-2">Seluruh pendapatan penjualan</p>
                  </div>
                  <div className="bg-surface-50 dark:bg-surface-800 rounded-2xl p-5 border border-surface-200 dark:border-surface-700">
                    <p className="text-surface-500 text-xs font-semibold uppercase tracking-wider mb-2">Total HPP (Modal)</p>
                    <p className="text-3xl font-black font-mono text-surface-900 dark:text-white">Rp {totalHPP.toLocaleString('id-ID')}</p>
                    <p className="text-xs text-surface-400 mt-2">Modal harga beli barang keluar</p>
                  </div>
                  <div className="bg-gradient-to-br from-success-500 to-teal-500 rounded-2xl p-5 text-white shadow-lg shadow-success-500/20">
                    <p className="text-white/80 text-xs font-semibold uppercase tracking-wider mb-2">Laba Bersih (Profit)</p>
                    <p className="text-3xl font-black font-mono">Rp {totalLaba.toLocaleString('id-ID')}</p>
                    <p className="text-xs text-white/90 mt-2 font-bold">Margin: {labaMargin.toFixed(1)}%</p>
                  </div>
                </div>
              );
            })()}

            <h4 className="font-bold text-sm text-surface-900 dark:text-white mb-4">Rincian Laba Per Barang</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-700 text-surface-500 uppercase tracking-wider font-semibold">
                    <th className="px-4 py-3">Nama Barang</th>
                    <th className="px-4 py-3 text-right">Terjual</th>
                    <th className="px-4 py-3 text-right">Omzet</th>
                    <th className="px-4 py-3 text-right">HPP</th>
                    <th className="px-4 py-3 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                  {Object.values(
                    filteredPenjualanList.reduce((acc, p) => {
                      if (!acc[p.barang_id]) {
                        acc[p.barang_id] = { barang_id: p.barang_id, qty: 0, omzet: 0, hpp: 0 };
                      }
                      acc[p.barang_id].qty += p.jumlah_satuan_kecil;
                      acc[p.barang_id].omzet += p.total_harga;
                      acc[p.barang_id].hpp += (p.harga_modal_satuan || 0) * p.jumlah_satuan_kecil;
                      return acc;
                    }, {} as Record<string, { barang_id: string; qty: number; omzet: number; hpp: number }>)
                  )
                  .sort((a, b) => (b.omzet - b.hpp) - (a.omzet - a.hpp))
                  .map(stats => {
                    const brg = barangList.find(b => b.id === stats.barang_id);
                    const profit = stats.omzet - stats.hpp;
                    return (
                      <tr key={stats.barang_id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50">
                        <td className="px-4 py-3 font-medium text-surface-900 dark:text-white">
                          {brg?.nama_barang || 'Barang Terhapus'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {stats.qty} {brg?.satuan_kecil || 'Pcs'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-surface-600 dark:text-surface-400">
                          Rp {stats.omzet.toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-surface-600 dark:text-surface-400">
                          Rp {stats.hpp.toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-success-600 dark:text-success-400">
                          Rp {profit.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: PENGATURAN (DANGER ZONE) ──────────────── */}
      {(activeTab === 'pengaturan' && userRole === 'superadmin') && (
        <div className="bg-white dark:bg-surface-900 rounded-3xl border border-danger-200 dark:border-danger-800 shadow-sm p-6 sm:p-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-6 text-danger-600 dark:text-danger-400">
            <AlertTriangle className="w-6 h-6" />
            <h3 className="font-bold text-lg">Danger Zone</h3>
          </div>
          <div className="bg-danger-50 dark:bg-danger-500/10 border border-danger-200 dark:border-danger-700/50 rounded-2xl p-6">
            <h4 className="font-bold text-danger-900 dark:text-danger-100 text-base mb-2">Reset Seluruh Data Toko</h4>
            <p className="text-sm text-danger-800 dark:text-danger-200/80 mb-6 max-w-2xl leading-relaxed">
              Tindakan ini akan <strong>menghapus seluruh riwayat mutasi dan transaksi penjualan</strong> secara permanen. 
              Selain itu, seluruh <strong>stok Master Barang akan dikembalikan menjadi 0</strong>. 
              Gunakan fitur ini hanya jika Anda ingin memulai dari awal (contoh: masa simulasi telah berakhir).
            </p>

            <div className="flex items-center gap-4">
              {resetCountdown === 0 ? (
                <button
                  onClick={startResetCountdown}
                  className="px-6 py-3 bg-danger-600 hover:bg-danger-700 text-white font-bold rounded-xl shadow-lg transition-colors cursor-pointer"
                >
                  Mulai Reset Data
                </button>
              ) : (
                <button
                  onClick={executeReset}
                  disabled={isResetting || resetCountdown > 1}
                  className={`px-6 py-3 font-bold rounded-xl shadow-lg transition-all ${
                    resetCountdown > 1 || isResetting
                      ? 'bg-surface-200 dark:bg-surface-800 text-surface-500 cursor-not-allowed'
                      : 'bg-danger-600 hover:bg-danger-700 text-white cursor-pointer animate-pulse'
                  }`}
                >
                  {isResetting ? (
                    <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Mereset...</span>
                  ) : resetCountdown > 1 ? (
                    `Konfirmasi dalam ${resetCountdown - 1} detik...`
                  ) : (
                    'Ya, Hapus Permanen Sekarang!'
                  )}
                </button>
              )}
              {resetCountdown > 0 && resetCountdown <= 5 && !isResetting && (
                <button
                  onClick={() => setResetCountdown(0)}
                  className="px-4 py-3 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batalkan
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      {showModalBeli && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModalBeli(false)} />
          <div className="relative w-full max-w-3xl bg-white dark:bg-surface-900 rounded-3xl shadow-2xl border border-surface-200 dark:border-surface-800 animate-fade-in overflow-hidden max-h-[90vh] flex flex-col">
            <div className="h-1.5 flex-shrink-0 bg-gradient-to-r from-indigo-500 to-purple-500" />
            <div className="p-6 text-xs flex-1 overflow-y-auto">
              <h3 className="text-base font-bold text-surface-900 dark:text-white mb-4">Input Pembelian (Restock Gudang)</h3>
              
              <form onSubmit={handleSimpanPembelian} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-1">Nomor Invoice / Bukti</label>
                    <input
                      type="text"
                      required
                      value={beliForm.nomor_invoice}
                      onChange={e => setBeliForm({ ...beliForm, nomor_invoice: e.target.value })}
                      placeholder="INV-001..."
                      className="w-full px-4 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Tanggal Pembelian</label>
                    <input
                      type="date"
                      required
                      value={beliForm.tanggal}
                      onChange={e => setBeliForm({ ...beliForm, tanggal: e.target.value })}
                      className="w-full px-4 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block font-semibold mb-1">Catatan Tambahan (Opsional)</label>
                  <input
                    type="text"
                    value={beliForm.catatan}
                    onChange={e => setBeliForm({ ...beliForm, catatan: e.target.value })}
                    placeholder="Beli dari Supplier A"
                    className="w-full px-4 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm">Daftar Barang</h4>
                    <button
                      type="button"
                      onClick={() => setBeliForm(prev => ({
                        ...prev,
                        items: [...prev.items, { barang_id: barangList[0]?.id || '', jumlah_satuan_besar: 1, harga_beli_satuan_besar: barangList[0]?.harga_beli_satuan_besar || 0 }]
                      }))}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Tambah Baris
                    </button>
                  </div>
                  
                  {beliForm.items.map((item, index) => (
                    <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700">
                      <div className="w-full sm:flex-1">
                        <label className="block text-[10px] font-semibold text-surface-500 mb-1">Barang</label>
                        <select
                          required
                          value={item.barang_id}
                          onChange={e => {
                            const newItems = [...beliForm.items];
                            const selectedBarang = barangList.find(b => b.id === e.target.value);
                            newItems[index] = { 
                              ...newItems[index], 
                              barang_id: e.target.value,
                              harga_beli_satuan_besar: selectedBarang?.harga_beli_satuan_besar || 0
                            };
                            setBeliForm({ ...beliForm, items: newItems });
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg"
                        >
                          <option value="">-- Pilih --</option>
                          {barangList.map(b => (
                            <option key={b.id} value={b.id}>{b.nama_barang}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="w-full sm:w-32">
                        <label className="block text-[10px] font-semibold text-surface-500 mb-1">
                          Qty ({barangList.find(b => b.id === item.barang_id)?.satuan_besar || 'Besar'})
                        </label>
                        <input
                          type="number"
                          required min={1}
                          value={item.jumlah_satuan_besar}
                          onChange={e => {
                            const newItems = [...beliForm.items];
                            newItems[index].jumlah_satuan_besar = parseInt(e.target.value) || 1;
                            setBeliForm({ ...beliForm, items: newItems });
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg"
                        />
                      </div>

                      <div className="w-full sm:w-48">
                        <label className="block text-[10px] font-semibold text-surface-500 mb-1">Harga Beli / Satuan Besar</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 font-bold">Rp</span>
                          <input
                            type="number"
                            required min={0}
                            value={item.harga_beli_satuan_besar}
                            onChange={e => {
                              const newItems = [...beliForm.items];
                              newItems[index].harga_beli_satuan_besar = parseInt(e.target.value) || 0;
                              setBeliForm({ ...beliForm, items: newItems });
                            }}
                            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg font-mono"
                          />
                        </div>
                      </div>

                      <div className="sm:pt-5">
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = beliForm.items.filter((_, i) => i !== index);
                            setBeliForm({ ...beliForm, items: newItems });
                          }}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          disabled={beliForm.items.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-surface-100 dark:border-surface-800 mt-6">
                  <button type="button" onClick={() => setShowModalBeli(false)} className="px-5 py-2.5 bg-surface-100 dark:bg-surface-800 rounded-xl font-bold cursor-pointer">
                    Batal
                  </button>
                  <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-bold cursor-pointer shadow-lg hover:brightness-110">
                    Simpan Pembelian
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDIT PEMBELIAN ── */}
      {showModalEditBeli && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModalEditBeli(false)} />
          <div className="relative w-full max-w-4xl bg-white dark:bg-surface-900 rounded-3xl shadow-2xl border border-surface-200 dark:border-surface-800 animate-fade-in overflow-hidden max-h-[90vh] flex flex-col">
            <div className="h-1.5 flex-shrink-0 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="p-6 text-xs flex-1 overflow-y-auto">
              <h3 className="text-base font-bold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-500" />
                Edit Pembelian: {editBeliForm.nomor_invoice}
              </h3>
              
              <form onSubmit={handleSimpanEditPembelian} className="space-y-6">
                <div>
                  <label className="block font-semibold mb-1">Catatan Tambahan</label>
                  <input
                    type="text"
                    value={editBeliForm.catatan}
                    onChange={e => setEditBeliForm({ ...editBeliForm, catatan: e.target.value })}
                    placeholder="Beli dari Supplier A"
                    className="w-full px-4 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm">Daftar Barang</h4>
                    <button
                      type="button"
                      onClick={() => setEditBeliForm(prev => ({
                        ...prev,
                        items: [...prev.items, { barang_id: barangList[0]?.id || '', jumlah_satuan_besar: 1, harga_beli_satuan_besar: barangList[0]?.harga_beli_satuan_besar || 0 }]
                      }))}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Tambah Baris
                    </button>
                  </div>
                  
                  {editBeliForm.items.map((item, index) => (
                    <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700">
                      <div className="w-full sm:flex-1">
                        <label className="block text-[10px] font-semibold text-surface-500 mb-1">Barang</label>
                        <select
                          required
                          value={item.barang_id}
                          onChange={e => {
                            const newItems = [...editBeliForm.items];
                            const selectedBarang = barangList.find(b => b.id === e.target.value);
                            newItems[index] = { 
                              ...newItems[index], 
                              barang_id: e.target.value,
                              harga_beli_satuan_besar: selectedBarang?.harga_beli_satuan_besar || 0
                            };
                            setEditBeliForm({ ...editBeliForm, items: newItems });
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg"
                        >
                          <option value="">-- Pilih --</option>
                          {barangList.map(b => (
                            <option key={b.id} value={b.id}>{b.nama_barang}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="w-full sm:w-32">
                        <label className="block text-[10px] font-semibold text-surface-500 mb-1">
                          Qty ({barangList.find(b => b.id === item.barang_id)?.satuan_besar || 'Besar'})
                        </label>
                        <input
                          type="number"
                          required min={1}
                          value={item.jumlah_satuan_besar}
                          onChange={e => {
                            const newItems = [...editBeliForm.items];
                            newItems[index].jumlah_satuan_besar = parseInt(e.target.value) || 1;
                            setEditBeliForm({ ...editBeliForm, items: newItems });
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg"
                        />
                      </div>

                      <div className="w-full sm:w-48 hidden">
                        {/* Not exactly needed to show harga_beli for edit since we don't retroactively adjust average price yet, but let's keep the structure for compatibility with items type */}
                      </div>

                      <div className="sm:pt-5">
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = editBeliForm.items.filter((_, i) => i !== index);
                            setEditBeliForm({ ...editBeliForm, items: newItems });
                          }}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          disabled={editBeliForm.items.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-surface-100 dark:border-surface-800 mt-6">
                  <button type="button" onClick={() => setShowModalEditBeli(false)} className="px-5 py-2.5 bg-surface-100 dark:bg-surface-800 rounded-xl font-bold cursor-pointer">
                    Batal
                  </button>
                  <button type="submit" disabled={isSyncing} className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-bold cursor-pointer shadow-lg hover:brightness-110 disabled:opacity-50">
                    {isSyncing ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showModalKeluarkan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModalKeluarkan(false)} />
          <div className="relative w-full max-w-3xl bg-white dark:bg-surface-900 rounded-3xl shadow-2xl border border-surface-200 dark:border-surface-800 animate-fade-in overflow-hidden max-h-[90vh] flex flex-col">
            <div className="h-1.5 flex-shrink-0 bg-gradient-to-r from-red-500 to-orange-500" />
            <div className="p-6 text-xs flex-1 overflow-y-auto">
              <h3 className="text-base font-bold text-surface-900 dark:text-white mb-4">Keluarkan Stok dari Gudang</h3>
              
              <form onSubmit={handleSimpanKeluarkan} className="space-y-6">
                <div>
                  <label className="block font-semibold mb-1">Catatan / Alasan</label>
                  <input
                    type="text"
                    required
                    value={keluarForm.catatan}
                    onChange={e => setKeluarForm({ ...keluarForm, catatan: e.target.value })}
                    placeholder="Sumbangan lomba agustusan, inventaris RT..."
                    className="w-full px-4 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm">Daftar Barang Keluar</h4>
                    <button
                      type="button"
                      onClick={() => setKeluarForm(prev => ({
                        ...prev,
                        items: [...prev.items, { barang_id: barangList[0]?.id || '', jumlah_satuan_besar: 1 }]
                      }))}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-bold rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Tambah Baris
                    </button>
                  </div>
                  
                  {keluarForm.items.map((item, index) => (
                    <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700">
                      <div className="w-full sm:flex-1">
                        <label className="block text-[10px] font-semibold text-surface-500 mb-1">Barang</label>
                        <select
                          required
                          value={item.barang_id}
                          onChange={e => {
                            const newItems = [...keluarForm.items];
                            newItems[index] = { 
                              ...newItems[index], 
                              barang_id: e.target.value
                            };
                            setKeluarForm({ ...keluarForm, items: newItems });
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg"
                        >
                          <option value="">-- Pilih --</option>
                          {barangList.map(b => (
                            <option key={b.id} value={b.id}>{b.nama_barang} (Sisa: {b.stok_gudang} {b.satuan_kecil})</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="w-full sm:w-32">
                        <label className="block text-[10px] font-semibold text-surface-500 mb-1">
                          Qty ({barangList.find(b => b.id === item.barang_id)?.satuan_besar || 'Besar'})
                        </label>
                        <input
                          type="number"
                          required min={1}
                          value={item.jumlah_satuan_besar}
                          onChange={e => {
                            const newItems = [...keluarForm.items];
                            newItems[index].jumlah_satuan_besar = parseInt(e.target.value) || 1;
                            setKeluarForm({ ...keluarForm, items: newItems });
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg"
                        />
                      </div>

                      <div className="sm:pt-5">
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = keluarForm.items.filter((_, i) => i !== index);
                            setKeluarForm({ ...keluarForm, items: newItems });
                          }}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          disabled={keluarForm.items.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-surface-100 dark:border-surface-800">
                  <button type="button" onClick={() => setShowModalKeluarkan(false)} className="px-5 py-2.5 bg-surface-100 dark:bg-surface-800 rounded-xl font-bold cursor-pointer">
                    Batal
                  </button>
                  <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-bold cursor-pointer shadow-md hover:brightness-110">
                    Keluarkan Stok
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DETAIL INVOICE PEMBELIAN ── */}
      {detailInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDetailInvoice(null)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-surface-900 rounded-3xl shadow-2xl border border-surface-200 dark:border-surface-800 animate-fade-in overflow-hidden flex flex-col max-h-[90vh]">
            <div className="h-1.5 flex-shrink-0 bg-gradient-to-r from-indigo-500 to-purple-500" />
            <div className="p-6 flex-shrink-0 flex items-start justify-between border-b border-surface-100 dark:border-surface-800">
              <div>
                <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-1">
                  Detail Invoice: <span className="text-indigo-600 dark:text-indigo-400">{detailInvoice.nomor_invoice}</span>
                </h3>
                <p className="text-xs text-surface-500">
                  {new Date(detailInvoice.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} • {detailInvoice.dibuat_oleh}
                </p>
                {detailInvoice.catatan && (
                  <p className="text-xs text-surface-500 italic mt-2 bg-surface-50 dark:bg-surface-800 p-2 rounded-lg">"{detailInvoice.catatan}"</p>
                )}
              </div>
              <button
                onClick={() => setDetailInvoice(null)}
                className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-0 overflow-y-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-50 dark:bg-surface-800/50 sticky top-0 shadow-sm">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-surface-500 uppercase tracking-wider">Nama Barang</th>
                    <th className="px-6 py-3 font-semibold text-surface-500 uppercase tracking-wider text-right">Qty Beli</th>
                    <th className="px-6 py-3 font-semibold text-surface-500 uppercase tracking-wider text-right">Harga Modal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                  {detailInvoice.items.map(p => {
                    const brg = barangList.find(b => b.id === p.barang_id);
                    return (
                      <tr key={p.id} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/30">
                        <td className="px-6 py-3 font-medium text-surface-900 dark:text-white">
                          {brg?.nama_barang || 'Barang Terhapus'}
                        </td>
                        <td className="px-6 py-3 text-right font-medium text-indigo-600 dark:text-indigo-400">
                          +{p.jumlah_satuan_besar} {brg?.satuan_besar || 'Dus'}
                        </td>
                        <td className="px-6 py-3 text-right font-mono text-surface-600 dark:text-surface-400">
                          Rp {(p.harga_beli_satuan_besar || 0).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 flex justify-end">
               <button onClick={() => setDetailInvoice(null)} className="px-5 py-2.5 bg-surface-200 hover:bg-surface-300 dark:bg-surface-700 dark:hover:bg-surface-600 rounded-xl font-bold transition-colors">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL RIWAYAT PENJUALAN */}
      {detailRiwayat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDetailRiwayat(null)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-surface-900 rounded-3xl shadow-2xl border border-surface-200 dark:border-surface-800 animate-fade-in overflow-hidden flex flex-col max-h-[90vh]">
            <div className="h-1.5 flex-shrink-0 bg-gradient-to-r from-teal-500 to-emerald-500" />
            <div className="p-6 flex-shrink-0 flex items-start justify-between border-b border-surface-100 dark:border-surface-800">
              <div>
                <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-1">
                  Detail Penjualan: <span className="text-teal-600 dark:text-teal-400">{detailRiwayat.nomor_invoice}</span>
                </h3>
                <p className="text-xs text-surface-500">
                  {new Date(detailRiwayat.tanggal).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} • Kasir: {detailRiwayat.dijual_oleh}
                </p>
                <div className="mt-3 px-3 py-2 bg-surface-50 dark:bg-surface-800 rounded-xl inline-block">
                  <span className="text-xs text-surface-500">Pelanggan:</span>
                  <span className="ml-2 text-sm font-bold text-surface-900 dark:text-white">{detailRiwayat.nama_pelanggan}</span>
                </div>
              </div>
              <button
                onClick={() => setDetailRiwayat(null)}
                className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-0 overflow-y-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-50 dark:bg-surface-800/50 sticky top-0 shadow-sm">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-surface-500 uppercase tracking-wider">Nama Barang</th>
                    <th className="px-6 py-3 font-semibold text-surface-500 uppercase tracking-wider text-right">Qty</th>
                    <th className="px-6 py-3 font-semibold text-surface-500 uppercase tracking-wider text-right">Harga Jual</th>
                    <th className="px-6 py-3 font-semibold text-surface-500 uppercase tracking-wider text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                  {detailRiwayat.items.map(p => {
                    const brg = barangList.find(b => b.id === p.barang_id);
                    return (
                      <tr key={p.id} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/30">
                        <td className="px-6 py-3 font-medium text-surface-900 dark:text-white">
                          {brg?.nama_barang || 'Barang Terhapus'}
                        </td>
                        <td className="px-6 py-3 text-right font-medium text-teal-600 dark:text-teal-400">
                          {p.jumlah_satuan_kecil} {brg?.satuan_kecil || 'Pcs'}
                        </td>
                        <td className="px-6 py-3 text-right font-mono text-surface-600 dark:text-surface-400">
                          Rp {(p.harga_satuan || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-3 text-right font-mono font-bold text-surface-900 dark:text-white">
                          Rp {(p.total_harga || 0).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 flex justify-end">
               <button onClick={() => setDetailRiwayat(null)} className="px-5 py-2.5 bg-surface-200 hover:bg-surface-300 dark:bg-surface-700 dark:hover:bg-surface-600 rounded-xl font-bold transition-colors cursor-pointer">Tutup</button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: EDIT RIWAYAT PENJUALAN */}
      {editRiwayat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditRiwayat(null)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-surface-900 rounded-3xl shadow-2xl border border-surface-200 dark:border-surface-800 animate-fade-in overflow-hidden flex flex-col max-h-[90vh]">
            <div className="h-1.5 flex-shrink-0 bg-gradient-to-r from-blue-500 to-indigo-500" />
            
            <form onSubmit={handleSimpanEditRiwayat} className="flex flex-col h-full overflow-hidden">
              <div className="p-6 flex-shrink-0 flex items-start justify-between border-b border-surface-100 dark:border-surface-800">
                <div>
                  <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-1">
                    Edit Invoice: <span className="text-blue-600 dark:text-blue-400">{editRiwayat.nomor_invoice}</span>
                  </h3>
                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-surface-500 mb-1">Nama Pelanggan / Catatan</label>
                    <input
                      type="text"
                      value={editRiwayat.nama_pelanggan}
                      onChange={e => setEditRiwayat({ ...editRiwayat, nama_pelanggan: e.target.value })}
                      className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditRiwayat(null)}
                  className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-0 overflow-y-auto flex-1">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-50 dark:bg-surface-800/50 sticky top-0 shadow-sm">
                    <tr>
                      <th className="px-6 py-3 font-semibold text-surface-500 uppercase tracking-wider">Nama Barang</th>
                      <th className="px-6 py-3 font-semibold text-surface-500 uppercase tracking-wider text-center">Qty</th>
                      <th className="px-6 py-3 font-semibold text-surface-500 uppercase tracking-wider text-right">Harga Jual / Pcs</th>
                      <th className="px-6 py-3 font-semibold text-surface-500 uppercase tracking-wider text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                    {editRiwayat.items.map((p, idx) => {
                      const brg = barangList.find(b => b.id === p.barang_id);
                      return (
                        <tr key={idx} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/30">
                          <td className="px-6 py-3 font-medium text-surface-900 dark:text-white">
                            {brg?.nama_barang || 'Barang Terhapus'}
                          </td>
                          <td className="px-6 py-3 text-center font-medium text-blue-600 dark:text-blue-400">
                            {p.jumlah_satuan_kecil} {brg?.satuan_kecil || 'Pcs'}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="relative w-32 ml-auto">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-surface-400 font-bold">Rp</span>
                              <input
                                type="number"
                                required min={0}
                                value={p.harga_satuan_custom}
                                onChange={e => {
                                  const newItems = [...editRiwayat.items];
                                  newItems[idx].harga_satuan_custom = parseInt(e.target.value) || 0;
                                  setEditRiwayat({ ...editRiwayat, items: newItems });
                                }}
                                className="w-full pl-8 pr-2 py-1.5 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg font-mono text-right"
                              />
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right font-mono font-bold text-surface-900 dark:text-white">
                            Rp {(p.harga_satuan_custom * p.jumlah_satuan_kecil).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="p-4 border-t border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 flex justify-end gap-3 flex-shrink-0">
                <button type="button" onClick={() => setEditRiwayat(null)} className="px-5 py-2.5 bg-surface-200 hover:bg-surface-300 dark:bg-surface-700 dark:hover:bg-surface-600 rounded-xl font-bold transition-colors cursor-pointer">
                  Batal
                </button>
                <button type="submit" disabled={isSyncing} className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-bold transition-all shadow-md hover:brightness-110 cursor-pointer disabled:opacity-50">
                  {isSyncing ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
