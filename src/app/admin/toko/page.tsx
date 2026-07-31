'use client';

// ============================================================
// Admin Toko Martinez Page — /admin/toko
// Manajemen Master Barang & Input Pembelian (Stok Gudang)
// ============================================================

import React, { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  AlertCircle,
  Download,
  ChevronDown,
  ClipboardCheck,
} from 'lucide-react';
import TokoAnalisisTab from '@/components/TokoAnalisisTab';
import type { TokoBarang, TokoPergerakanStok, TokoPenjualan } from '@/types';
import {
  getTokoBarangLocal,
  getTokoPergerakanLocal,
  getTokoPenjualanLocal,
  getTokoPaymentHarianLocal,
  saveTokoPaymentHarian,
  syncTokoDataFromCloud,
  deleteTokoBarang,
  addPembelianBatchGudang,
  keluarkanBatchGudang,
  pindahKeDisplayBatch,
  deletePenjualanInvoice,
  editPenjualanInvoice,
  resetSemuaDataToko,
  deleteMutasiStok,
  updateMutasiStok,
  deletePembelianInvoice,
  editPembelianInvoice,
  saveOpnameStokBatch,
  getClientUserName,
  type PembelianItem,
  type KeluarkanItem,
} from '@/lib/toko-store';

export default function AdminTokoPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'analisis' | 'master' | 'pembelian' | 'mutasi' | 'riwayat' | 'laba_rugi' | 'opname' | 'pengaturan'>('analisis');
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTab = sessionStorage.getItem('admin_toko_active_tab');
      if (savedTab) {
        setActiveTab(savedTab as any);
      }
    }
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as any);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('admin_toko_active_tab', tab);
    }
  };
  const [barangList, setBarangList] = useState<TokoBarang[]>([]);
  const [pergerakanList, setPergerakanList] = useState<TokoPergerakanStok[]>([]);
  const [penjualanList, setPenjualanList] = useState<TokoPenjualan[]>([]);
  const [paymentList, setPaymentList] = useState<any[]>([]);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [paymentInputs, setPaymentInputs] = useState<Record<string, string>>({});

  // ── MODAL STATES ──

  const [showModalKeluarkan, setShowModalKeluarkan] = useState(false);
  const [keluarForm, setKeluarForm] = useState<{
    catatan: string;
    items: KeluarkanItem[];
  }>({
    catatan: '',
    items: [],
  });

  const [showModalPindah, setShowModalPindah] = useState(false);
  const [pindahForm, setPindahForm] = useState<{ items: { barang_id: string; jumlah_satuan_kecil: number }[] }>({ items: [] });

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

  const [editMutasi, setEditMutasi] = useState<{
    id: string;
    barang_id: string;
    jumlah_satuan_kecil: number;
    catatan: string;
    jenis: string;
  } | null>(null);

  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  // -- OPNAME STATE --
  const [opnameTipe, setOpnameTipe] = useState<'gudang' | 'display'>('gudang');
  const [opnameItems, setOpnameItems] = useState<{barang_id: string, stok_fisik: number, stok_sistem: number}[]>([]);
  const [isOpnameSubmitting, setIsOpnameSubmitting] = useState(false);

  const handleInitOpname = (tipe: 'gudang' | 'display') => {
    setOpnameTipe(tipe);
    const initialItems = barangList.map(b => ({
      barang_id: b.id,
      stok_sistem: tipe === 'gudang' ? (b.stok_gudang || 0) : (b.stok_display || 0),
      stok_fisik: tipe === 'gudang' ? (b.stok_gudang || 0) : (b.stok_display || 0)
    }));
    setOpnameItems(initialItems);
  };

  useEffect(() => {
    if (activeTab === 'opname') {
      handleInitOpname(opnameTipe);
    }
  }, [activeTab, opnameTipe, barangList]);

  const handleSimpanOpname = async () => {
    const selisihAda = opnameItems.some(item => item.stok_fisik !== item.stok_sistem);
    if (!selisihAda) {
      showToast('Tidak ada selisih stok untuk disimpan.');
      return;
    }

    if (!confirm(`Simpan hasil opname ${opnameTipe === 'gudang' ? 'Gudang' : 'Display'}?`)) return;

    setIsOpnameSubmitting(true);
    const user = getClientUserName('Admin');
    const res = await saveOpnameStokBatch(opnameTipe, opnameItems, '', user);
    
    if (res.success) {
      showToast(`Opname berhasil disimpan! Ada ${res.count} barang disesuaikan.`);
      loadData();
    } else {
      showToast(`Gagal opname: ${res.error}`);
    }
    setIsOpnameSubmitting(false);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = () => {
    setBarangList(getTokoBarangLocal());
    setPergerakanList(getTokoPergerakanLocal());
    setPenjualanList(getTokoPenjualanLocal());
    const payments = getTokoPaymentHarianLocal();
    setPaymentList(payments);
    
    const initialInputs: Record<string, string> = {};
    payments.forEach((p: any) => {
      initialInputs[p.tanggal] = p.payment_diterima.toString();
    });
    setPaymentInputs(initialInputs);
  };

  const handleKonfirmasiPayment = async (tanggal: string) => {
    const amountStr = paymentInputs[tanggal] || '0';
    const amount = parseInt(amountStr, 10);
    if (isNaN(amount)) return showToast('Nominal tidak valid!');
    
    setIsSyncing(true);
    const user = getClientUserName('Admin');
    const res = await saveTokoPaymentHarian(tanggal, amount, user);
    if (res.success) {
      showToast(`Payment untuk ${tanggal} berhasil disimpan!`);
      loadData();
    } else {
      showToast(`Gagal menyimpan payment: ${res.error}`);
    }
    setIsSyncing(false);
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


  const handleSimpanKeluarkan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (keluarForm.items.length === 0) return;

    const user = getClientUserName('Admin');
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

  const handleSimpanPindah = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pindahForm.items.length === 0) return;

    const user = getClientUserName('Admin');
    const res = await pindahKeDisplayBatch(pindahForm.items, user);

    if (res.success) {
      showToast('Berhasil pindah barang ke Display!');
      setShowModalPindah(false);
      loadData();
    } else {
      showToast(`Gagal: ${res.error}`);
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
    const user = getClientUserName('Admin');
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

  const handleSimpanEditMutasi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMutasi) return;

    setIsSyncing(true);
    const user = getClientUserName('Admin');
    const res = await updateMutasiStok(
      editMutasi.id,
      editMutasi.barang_id,
      editMutasi.jumlah_satuan_kecil,
      editMutasi.catatan,
      user
    );

    if (res.success) {
      showToast('Data mutasi berhasil diperbarui!');
      setEditMutasi(null);
      loadData();
    } else {
      showToast(`Gagal mengedit mutasi: ${res.error}`);
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
      {/* ── Toast Notification ────────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-5 py-3.5 bg-surface-900 text-white rounded-2xl shadow-2xl border border-white/10 animate-fade-in text-sm font-medium">
          <Check className="w-4 h-4 text-success-400 flex-shrink-0" />
          {toastMessage}
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
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
            onClick={() => handleTabChange('opname')}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-semibold text-xs rounded-xl shadow-sm hover:brightness-110 transition-all cursor-pointer"
          >
            <ClipboardCheck className="w-4 h-4" />
            Opname Stok
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

      {/* ── Tabs Navigation & Filters ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-surface-100/50 dark:bg-surface-800/50 p-1.5 rounded-2xl w-full lg:w-fit overflow-x-auto no-scrollbar">
          <button
            onClick={() => handleTabChange('analisis')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs whitespace-nowrap flex-shrink-0 transition-all cursor-pointer ${
              activeTab === 'analisis'
                ? 'bg-white dark:bg-surface-900 text-amber-600 dark:text-amber-400 shadow-sm border border-surface-200/50 dark:border-surface-700/50'
                : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Analisis Barang
          </button>
          <button
          onClick={() => handleTabChange('master')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs whitespace-nowrap flex-shrink-0 transition-all cursor-pointer ${
            activeTab === 'master'
              ? 'bg-white dark:bg-surface-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-surface-200/50 dark:border-surface-700/50'
              : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
          }`}
        >
          <Package className="w-4 h-4" />
          Master Barang
        </button>
        <button
          onClick={() => handleTabChange('pembelian')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs whitespace-nowrap flex-shrink-0 transition-all cursor-pointer ${
            activeTab === 'pembelian'
              ? 'bg-white dark:bg-surface-900 text-purple-600 dark:text-purple-400 shadow-sm border border-surface-200/50 dark:border-surface-700/50'
              : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          Restock Pembelian
        </button>
        <button
          onClick={() => handleTabChange('mutasi')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs whitespace-nowrap flex-shrink-0 transition-all cursor-pointer ${
            activeTab === 'mutasi'
              ? 'bg-white dark:bg-surface-900 text-blue-600 dark:text-blue-400 shadow-sm border border-surface-200/50 dark:border-surface-700/50'
              : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          Riwayat Mutasi
        </button>
        <button
          onClick={() => handleTabChange('riwayat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs whitespace-nowrap flex-shrink-0 transition-all cursor-pointer ${
            activeTab === 'riwayat'
              ? 'bg-white dark:bg-surface-900 text-teal-600 dark:text-teal-400 shadow-sm border border-surface-200/50 dark:border-surface-700/50'
              : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
          }`}
        >
          <History className="w-4 h-4" />
          Riwayat Penjualan
        </button>
        <button
          onClick={() => handleTabChange('laba_rugi')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs whitespace-nowrap flex-shrink-0 transition-all cursor-pointer ${
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
            onClick={() => handleTabChange('pengaturan')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs whitespace-nowrap flex-shrink-0 transition-all cursor-pointer ${
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
          penjualanList={penjualanList} 
          pergerakanList={pergerakanList}
          barangList={barangList} 
          filterMonth={filterMonth}
          filterYear={filterYear}
        />
      )}

      {/* ── TAB CONTENT: MASTER BARANG ────────────────────────────────── */}
      {activeTab === 'master' && (
        <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-700 text-surface-500 uppercase tracking-wider font-semibold">
                  <th className="px-5 py-4">Nama Barang</th>
                  <th className="px-5 py-4">Satuan Beli (Gudang)</th>
                  <th className="px-5 py-4">Satuan Jual (Display)</th>
                  <th className="px-5 py-4">Harga Beli</th>
                  <th className="px-5 py-4">Harga Jual</th>
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
                        Rp {Math.round(b.harga_beli_satuan_besar / (b.qty_per_satuan_besar || 1)).toLocaleString('id-ID')}
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

      {/* ── TAB CONTENT: PEMBELIAN ────────────────────────────────────── */}
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
                  setPindahForm({ items: [{ barang_id: barangList[0]?.id || '', jumlah_satuan_kecil: 1 }] });
                  setShowModalPindah(true);
                }}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer whitespace-nowrap"
              >
                + Pindah ke Display
              </button>
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
                  onClick={() => router.push('/admin/toko/pembelian/tambah')}
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
                              onClick={() => router.push('/admin/toko/pembelian/edit/' + invoice.nomor_invoice)}
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

      {/* ── TAB CONTENT: MUTASI GUDANG ────────────────────────────────── */}
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
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setEditMutasi({
                                id: item.id,
                                barang_id: item.barang_id,
                                jumlah_satuan_kecil: item.qtyKecil,
                                catatan: item.catatan !== '-' && item.catatan !== 'Pindah ke etalase/kulkas' ? item.catatan : '',
                                jenis: item.jenis
                              })}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-lg transition-colors cursor-pointer"
                              title="Edit Mutasi"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMutasi(item.id, item.jenis)}
                              className="p-1.5 text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/20 rounded-lg transition-colors cursor-pointer"
                              title="Undo Mutasi"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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

      {/* ── TAB CONTENT: RIWAYAT PENJUALAN ────────────────────────── */}
      {activeTab === 'riwayat' && (
        <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden p-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <h3 className="font-bold text-base text-surface-900 dark:text-white">Riwayat Penjualan (Struk)</h3>
              <p className="text-xs text-surface-500 mt-1">Laporan penjualan kasir dengan nama pelanggan dan nomor nota.</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Link
                href="/toko/kasir"
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 font-bold rounded-xl text-xs hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors w-full sm:w-auto justify-center"
              >
                <PlusCircle className="w-4 h-4" />
                Input Penjualan
              </Link>
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
                              className="px-3 py-1.5 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:teal-400 hover:bg-teal-100 dark:hover:bg-teal-500/20 font-bold rounded-lg transition-colors cursor-pointer"
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

      {/* ── TAB CONTENT: LABA RUGI ────────────────────────────────────── */}
      {activeTab === 'laba_rugi' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-sm p-6">
            <h3 className="font-bold text-base text-surface-900 dark:text-white mb-6">Laporan Laba Rugi & Payment Harian</h3>
            
            {(() => {
              const totalOmzet = filteredPenjualanList.reduce((sum, p) => sum + p.total_harga, 0);
              const totalHPP = filteredPenjualanList.reduce((sum, p) => sum + ((p.harga_modal_satuan || 0) * p.jumlah_satuan_kecil), 0);
              
              let totalOpnameLoss = 0;
              filteredPergerakanList.forEach(p => {
                if ((p.jenis_pergerakan === 'OPNAME_GUDANG' || p.jenis_pergerakan === 'OPNAME_DISPLAY') && p.jumlah_satuan_kecil < 0) {
                  const brg = barangList.find(b => b.id === p.barang_id);
                  if (brg) {
                    const hargaModal = Math.round(brg.harga_beli_satuan_besar / (brg.qty_per_satuan_besar || 1));
                    totalOpnameLoss += (Math.abs(p.jumlah_satuan_kecil) * hargaModal);
                  }
                }
              });

              const totalLabaBersih = totalOmzet - totalHPP - totalOpnameLoss;
              
              // Hitung Group by Tanggal
              const groupedByDate: Record<string, {
                tanggal: string;
                omset: number;
                hpp: number;
                profit: number;
                items: { barang_id: string; qty: number; omset: number; hpp: number }[];
              }> = {};

              filteredPenjualanList.forEach(p => {
                const tgl = (p.created_at || new Date().toISOString()).split('T')[0];
                if (!groupedByDate[tgl]) {
                  groupedByDate[tgl] = { tanggal: tgl, omset: 0, hpp: 0, profit: 0, items: [] };
                }
                groupedByDate[tgl].omset += p.total_harga;
                groupedByDate[tgl].hpp += ((p.harga_modal_satuan || 0) * p.jumlah_satuan_kecil);
                groupedByDate[tgl].profit = groupedByDate[tgl].omset - groupedByDate[tgl].hpp;

                let itemNode = groupedByDate[tgl].items.find(x => x.barang_id === p.barang_id);
                if (!itemNode) {
                  itemNode = { barang_id: p.barang_id, qty: 0, omset: 0, hpp: 0 };
                  groupedByDate[tgl].items.push(itemNode);
                }
                itemNode.qty += p.jumlah_satuan_kecil;
                itemNode.omset += p.total_harga;
                itemNode.hpp += ((p.harga_modal_satuan || 0) * p.jumlah_satuan_kecil);
              });

              const sortedDates = Object.values(groupedByDate).sort((a, b) => b.tanggal.localeCompare(a.tanggal));

              // Hitung Total Payment Diterima untuk filter bulan/tahun ini
              let totalPayment = 0;
              sortedDates.forEach(d => {
                const p = paymentList.find(x => x.tanggal === d.tanggal);
                if (p) totalPayment += p.payment_diterima;
              });

              const totalSelisih = totalPayment - totalOmzet;

              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl p-4 sm:p-5 text-white shadow-lg shadow-indigo-500/20">
                      <p className="text-white/80 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2">Total Omset</p>
                      <p className="text-xl sm:text-2xl font-black font-mono">Rp {totalOmzet.toLocaleString('id-ID')}</p>
                      <p className="text-[10px] sm:text-xs text-white/70 mt-2">Seluruh pendapatan penjualan</p>
                    </div>
                    <div className={`rounded-2xl p-4 sm:p-5 text-white shadow-lg ${totalSelisih < 0 ? 'bg-gradient-to-br from-rose-500 to-red-600 shadow-red-500/20' : 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-orange-500/20'}`}>
                      <p className="text-white/80 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2">Total Selisih Kas</p>
                      <p className="text-xl sm:text-2xl font-black font-mono">Rp {totalSelisih.toLocaleString('id-ID')}</p>
                      <p className="text-[10px] sm:text-xs text-white/90 mt-2 font-bold">Payment Diterima - Omset</p>
                    </div>
                    <div className="bg-gradient-to-br from-slate-600 to-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-lg shadow-slate-500/20">
                      <p className="text-white/80 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2">Beban Kehilangan</p>
                      <p className="text-xl sm:text-2xl font-black font-mono">Rp {totalOpnameLoss.toLocaleString('id-ID')}</p>
                      <p className="text-[10px] sm:text-xs text-white/70 mt-2">Selisih negatif dari stok opname</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-4 sm:p-5 text-white shadow-lg shadow-emerald-500/20">
                      <p className="text-white/80 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2">Laba Bersih (Profit)</p>
                      <p className="text-xl sm:text-2xl font-black font-mono">Rp {totalLabaBersih.toLocaleString('id-ID')}</p>
                      <p className="text-[10px] sm:text-xs text-white/90 mt-2 font-bold">Omset - (HPP + Beban)</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto pb-10">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-700 text-surface-500 uppercase tracking-wider font-semibold">
                          <th className="px-4 py-3">Tanggal</th>
                          <th className="px-4 py-3 text-right">Jml Omset Harian</th>
                          <th className="px-4 py-3">Payment Diterima</th>
                          <th className="px-4 py-3 text-right">Selisih</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                        {sortedDates.map(stats => {
                          const isExpanded = !!expandedDates[stats.tanggal];
                          const savedPayment = paymentList.find(x => x.tanggal === stats.tanggal)?.payment_diterima || 0;
                          const currentSelisih = savedPayment - stats.omset;
                          
                          return (
                            <React.Fragment key={stats.tanggal}>
                              <tr className={`hover:bg-surface-50 dark:hover:bg-surface-800/50 ${isExpanded ? 'bg-surface-50/50 dark:bg-surface-800/20' : ''}`}>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => setExpandedDates(prev => ({ ...prev, [stats.tanggal]: !prev[stats.tanggal] }))}
                                    className="flex items-center gap-2 font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                  >
                                    <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    {new Date(stats.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                  </button>
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-surface-900 dark:text-white">
                                  Rp {stats.omset.toLocaleString('id-ID')}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-2">
                                      <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 font-mono">Rp</span>
                                        <input 
                                          type="number"
                                          value={paymentInputs[stats.tanggal] !== undefined ? paymentInputs[stats.tanggal] : ''}
                                          onChange={e => setPaymentInputs(prev => ({ ...prev, [stats.tanggal]: e.target.value }))}
                                          className="w-32 pl-9 pr-3 py-1.5 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg font-mono text-xs"
                                          placeholder="0"
                                        />
                                      </div>
                                      <button 
                                        onClick={() => handleKonfirmasiPayment(stats.tanggal)}
                                        className="px-3 py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 font-bold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors cursor-pointer"
                                      >
                                        {paymentList.find(x => x.tanggal === stats.tanggal)?.dikonfirmasi_oleh ? 'Update' : 'Konfirmasi'}
                                      </button>
                                    </div>
                                    {paymentList.find(x => x.tanggal === stats.tanggal)?.dikonfirmasi_oleh ? (() => {
                                      const p = paymentList.find(x => x.tanggal === stats.tanggal)!;
                                      return (
                                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                          <Check className="w-3 h-3 flex-shrink-0" />
                                          <span>Oleh {p.dikonfirmasi_oleh} pada {p.dikonfirmasi_pada ? new Date(p.dikonfirmasi_pada).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' }) : '-'}</span>
                                        </div>
                                      );
                                    })() : (
                                      <div className="text-[10px] text-amber-500 font-medium flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                        <span>Belum dikonfirmasi</span>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className={`px-4 py-3 text-right font-mono font-bold ${currentSelisih < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                  Rp {currentSelisih.toLocaleString('id-ID')}
                                </td>
                              </tr>
                              
                              {/* Rincian Barang per Hari */}
                              {isExpanded && (
                                <tr>
                                  <td colSpan={4} className="p-0 border-b border-surface-100 dark:border-surface-800">
                                    <div className="bg-surface-50 dark:bg-surface-800/30 p-4 border-l-4 border-indigo-500">
                                      <h5 className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-3">Rincian Penjualan ({stats.tanggal})</h5>
                                      <table className="w-full text-xs text-left">
                                        <thead>
                                          <tr className="border-b border-surface-200 dark:border-surface-700 text-surface-500">
                                            <th className="py-2 font-semibold">Barang</th>
                                            <th className="py-2 text-right font-semibold">Terjual</th>
                                            <th className="py-2 text-right font-semibold">Omzet</th>
                                            <th className="py-2 text-right font-semibold">HPP</th>
                                            <th className="py-2 text-right font-semibold">Profit</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-surface-200/50 dark:divide-surface-700/50">
                                          {stats.items.sort((a,b) => (b.omset - b.hpp) - (a.omset - a.hpp)).map(item => {
                                            const brg = barangList.find(b => b.id === item.barang_id);
                                            return (
                                              <tr key={item.barang_id}>
                                                <td className="py-2 text-surface-700 dark:text-surface-300">{brg?.nama_barang || 'Barang Terhapus'}</td>
                                                <td className="py-2 text-right font-medium">{item.qty} {brg?.satuan_kecil || 'Pcs'}</td>
                                                <td className="py-2 text-right font-mono text-surface-600 dark:text-surface-400">Rp {item.omset.toLocaleString('id-ID')}</td>
                                                <td className="py-2 text-right font-mono text-surface-500">Rp {item.hpp.toLocaleString('id-ID')}</td>
                                                <td className="py-2 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                                  Rp {(item.omset - item.hpp).toLocaleString('id-ID')}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                        {sortedDates.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-surface-500">
                              Tidak ada data penjualan pada bulan/tahun ini.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: PENGATURAN (DANGER ZONE) ────────────────── */}
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

      {/* ── MODAL PINDAH KE DISPLAY ── */}
      {showModalPindah && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModalPindah(false)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-surface-900 rounded-3xl shadow-2xl border border-surface-200 dark:border-surface-800 animate-fade-in overflow-hidden max-h-[90vh] flex flex-col">
            <div className="h-1.5 flex-shrink-0 bg-gradient-to-r from-cyan-500 to-blue-500" />
            <div className="p-6 text-xs flex-1 overflow-y-auto">
              <h3 className="font-bold text-lg mb-4 text-surface-900 dark:text-white">Pindah Stok Gudang ke Display</h3>
              <form onSubmit={handleSimpanPindah} className="space-y-6">
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm">Daftar Barang</h4>
                    <button
                      type="button"
                      onClick={() => setPindahForm(prev => ({
                        ...prev,
                        items: [...prev.items, { barang_id: barangList[0]?.id || '', jumlah_satuan_kecil: 1 }]
                      }))}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-500/20 transition-colors"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Tambah Baris
                    </button>
                  </div>
                  
                  {pindahForm.items.map((item, index) => (
                    <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700">
                      <div className="w-full sm:flex-1">
                        <label className="block text-[10px] font-semibold text-surface-500 mb-1">Barang</label>
                        <select
                          required
                          value={item.barang_id}
                          onChange={e => {
                            const newItems = [...pindahForm.items];
                            newItems[index] = { 
                              ...newItems[index], 
                              barang_id: e.target.value
                            };
                            setPindahForm({ ...pindahForm, items: newItems });
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg"
                        >
                          <option value="">-- Pilih --</option>
                          {barangList.map(b => (
                            <option key={b.id} value={b.id}>{b.nama_barang} (Gudang: {b.stok_gudang} {b.satuan_kecil})</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="w-full sm:w-32">
                        <label className="block text-[10px] font-semibold text-surface-500 mb-1">
                          Qty ({barangList.find(b => b.id === item.barang_id)?.satuan_kecil || 'Pcs'})
                        </label>
                        <input
                          type="number"
                          required min={1}
                          value={item.jumlah_satuan_kecil || ''}
                          onChange={e => {
                            const newItems = [...pindahForm.items];
                            newItems[index].jumlah_satuan_kecil = e.target.value === '' ? 0 : (parseInt(e.target.value) || 0);
                            setPindahForm({ ...pindahForm, items: newItems });
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg"
                        />
                      </div>

                      <div className="sm:pt-5">
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = pindahForm.items.filter((_, i) => i !== index);
                            setPindahForm({ ...pindahForm, items: newItems });
                          }}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          disabled={pindahForm.items.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-surface-100 dark:border-surface-800">
                  <button type="button" onClick={() => setShowModalPindah(false)} className="px-5 py-2.5 bg-surface-100 dark:bg-surface-800 rounded-xl font-bold cursor-pointer">
                    Batal
                  </button>
                  <button type="submit" className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold transition-all shadow-md cursor-pointer">
                    Pindahkan Stok
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

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ MODAL: DETAIL INVOICE PEMBELIAN Ã¢â€â‚¬Ã¢â€â‚¬ */}
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
                  {new Date(detailInvoice.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} Ã¢â‚¬Â¢ {detailInvoice.dibuat_oleh}
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
            
            <div className="p-0 overflow-y-auto overflow-x-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-50 dark:bg-surface-800/50 sticky top-0 shadow-sm">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-surface-500 uppercase tracking-wider">Nama Barang</th>
                    <th className="px-6 py-3 font-semibold text-surface-500 uppercase tracking-wider text-right">Qty Beli</th>
                    <th className="px-6 py-3 font-semibold text-surface-500 uppercase tracking-wider text-right">Harga Satuan</th>
                    <th className="px-6 py-3 font-semibold text-surface-500 uppercase tracking-wider text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                  {detailInvoice.items.map(p => {
                    const brg = barangList.find(b => b.id === p.barang_id);
                    const isKecil = p.jumlah_satuan_besar === 0;
                    const qtyPerBesar = brg?.qty_per_satuan_besar || 1;
                    const hargaBeliBesar = p.harga_beli_satuan_besar || 0;
                    const hargaBeliPerUnit = isKecil ? Math.round(hargaBeliBesar / qtyPerBesar) : hargaBeliBesar;
                    const qty = isKecil ? p.jumlah_satuan_kecil : p.jumlah_satuan_besar;
                    const unitLabel = isKecil ? (brg?.satuan_kecil || 'Pcs') : (brg?.satuan_besar || 'Dus');
                    const totalPerItem = qty * hargaBeliPerUnit;

                    return (
                      <tr key={p.id} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/30">
                        <td className="px-4 py-3">
                          <div className="font-semibold">{brg?.nama_barang || 'Unknown'}</div>
                          <div className="text-surface-500">
                            {p.jumlah_satuan_besar > 0 ? (
                              <>
                                {p.jumlah_satuan_besar} {brg?.satuan_besar || 'Dus'}
                                {p.jumlah_satuan_kecil > 0 && ` (${p.jumlah_satuan_kecil} ${brg?.satuan_kecil || 'Pcs'})`}
                              </>
                            ) : (
                              <>
                                {p.jumlah_satuan_kecil} {brg?.satuan_kecil || 'Pcs'}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right font-medium text-indigo-600 dark:text-indigo-400">
                          +{qty} {unitLabel}
                        </td>
                        <td className="px-6 py-3 text-right font-mono text-surface-600 dark:text-surface-400">
                          Rp {hargaBeliPerUnit.toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-3 text-right font-mono font-bold text-surface-900 dark:text-white">
                          Rp {totalPerItem.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-surface-50 dark:bg-surface-800/80 sticky bottom-0 border-t border-surface-200 dark:border-surface-700">
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-right font-bold text-surface-900 dark:text-white uppercase tracking-wider text-xs">
                      Grand Total Pembelian
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                      Rp {detailInvoice.items.reduce((sum, p) => {
                        const brg = barangList.find(b => b.id === p.barang_id);
                        const isKecil = p.jumlah_satuan_besar === 0;
                        const qtyPerBesar = brg?.qty_per_satuan_besar || 1;
                        const hargaBeliBesar = p.harga_beli_satuan_besar || 0;
                        const hargaBeliPerUnit = isKecil ? Math.round(hargaBeliBesar / qtyPerBesar) : hargaBeliBesar;
                        const qty = isKecil ? p.jumlah_satuan_kecil : p.jumlah_satuan_besar;
                        return sum + (qty * hargaBeliPerUnit);
                      }, 0).toLocaleString('id-ID')}
                    </td>
                  </tr>
                </tfoot>
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
                  {new Date(detailRiwayat.tanggal).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} Ã¢â‚¬Â¢ Kasir: {detailRiwayat.dijual_oleh}
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
            
            <div className="p-0 overflow-y-auto overflow-x-auto flex-1">
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
              
              <div className="p-0 overflow-y-auto overflow-x-auto flex-1">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-50 dark:bg-surface-800/50 sticky top-0 shadow-sm">
                    <tr>
                      <th className="px-6 py-3 font-semibold text-surface-500 uppercase tracking-wider">Nama Barang</th>
                      <th className="px-6 py-3 font-semibold text-surface-500 uppercase tracking-wider text-center">Qty</th>
                      <th className="px-6 py-3 font-semibold text-surface-500 uppercase tracking-wider text-right">Harga Jual / Pcs</th>
                      <th className="px-6 py-3 font-semibold text-surface-500 uppercase tracking-wider text-right">Subtotal</th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                    {editRiwayat.items.map((p, idx) => {
                      const brg = barangList.find(b => b.id === p.barang_id);
                      return (
                        <tr key={idx} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/30">
                          <td className="px-6 py-3 font-medium text-surface-900 dark:text-white">
                            <select
                              required
                              value={p.barang_id}
                              onChange={e => {
                                const newItems = [...editRiwayat.items];
                                const selectedB = barangList.find(b => b.id === e.target.value);
                                newItems[idx].barang_id = e.target.value;
                                if (selectedB && newItems[idx].harga_satuan_custom === 0) {
                                  newItems[idx].harga_satuan_custom = selectedB.harga_jual_satuan_kecil || 0;
                                }
                                setEditRiwayat({ ...editRiwayat, items: newItems });
                              }}
                              className="w-full px-2 py-1.5 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg"
                            >
                              <option value="">-- Pilih Barang --</option>
                              {barangList.map(bItem => (
                                <option key={bItem.id} value={bItem.id}>{bItem.nama_barang}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-3 text-center font-medium text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1">
                            <input
                              type="number"
                              required min={1}
                              value={p.jumlah_satuan_kecil}
                              onChange={e => {
                                const newItems = [...editRiwayat.items];
                                newItems[idx].jumlah_satuan_kecil = parseInt(e.target.value) || 1;
                                setEditRiwayat({ ...editRiwayat, items: newItems });
                              }}
                              className="w-16 px-2 py-1 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg text-center"
                            />
                            <span className="text-[10px]">{brg?.satuan_kecil || 'Pcs'}</span>
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
                          <td className="px-6 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = editRiwayat.items.filter((_, i) => i !== idx);
                                setEditRiwayat({ ...editRiwayat, items: newItems });
                              }}
                              className="p-1.5 text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/20 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="p-4 flex justify-between items-center border-t border-surface-100 dark:border-surface-800">
                  <button
                    type="button"
                    onClick={() => {
                      setEditRiwayat({
                        ...editRiwayat,
                        items: [...editRiwayat.items, { barang_id: '', jumlah_satuan_kecil: 1, harga_satuan_custom: 0 }]
                      });
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors text-xs"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Tambah Baris
                  </button>
                  <div className="font-bold text-sm">
                    Grand Total: <span className="text-blue-600 dark:text-blue-400">Rp {editRiwayat.items.reduce((acc, curr) => acc + (curr.jumlah_satuan_kecil * curr.harga_satuan_custom), 0).toLocaleString('id-ID')}</span>
                  </div>
                </div>
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
      {/* MODAL: EDIT MUTASI */}
      {editMutasi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditMutasi(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-3xl shadow-2xl border border-surface-200 dark:border-surface-800 animate-fade-in overflow-hidden">
            <div className="h-1.5 flex-shrink-0 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <form onSubmit={handleSimpanEditMutasi}>
              <div className="p-6 border-b border-surface-100 dark:border-surface-800 flex justify-between items-center">
                <h3 className="text-lg font-bold text-surface-900 dark:text-white">Edit Mutasi</h3>
                <button type="button" onClick={() => setEditMutasi(null)} className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-surface-500 mb-1">Barang</label>
                  <select
                    required
                    value={editMutasi.barang_id}
                    onChange={e => setEditMutasi({ ...editMutasi, barang_id: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Pilih Barang --</option>
                    {barangList.map(b => (
                      <option key={b.id} value={b.id}>{b.nama_barang}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-500 mb-1">Qty</label>
                  <input
                    type="number"
                    required min={1}
                    value={editMutasi.jumlah_satuan_kecil}
                    onChange={e => setEditMutasi({ ...editMutasi, jumlah_satuan_kecil: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-500 mb-1">Catatan Tambahan (Opsional)</label>
                  <input
                    type="text"
                    value={editMutasi.catatan}
                    onChange={e => setEditMutasi({ ...editMutasi, catatan: e.target.value })}
                    placeholder="Contoh: Kesalahan input sebelumnya"
                    className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="p-4 border-t border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 flex justify-end gap-3">
                <button type="button" onClick={() => setEditMutasi(null)} className="px-5 py-2.5 bg-surface-200 hover:bg-surface-300 dark:bg-surface-700 dark:hover:bg-surface-600 rounded-xl font-bold transition-colors cursor-pointer text-sm">
                  Batal
                </button>
                <button type="submit" disabled={isSyncing} className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-bold transition-all shadow-md hover:brightness-110 cursor-pointer disabled:opacity-50 text-sm">
                  {isSyncing ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── TAB CONTENT: OPNAME STOK ── */}
      {activeTab === 'opname' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-bold text-base text-surface-900 dark:text-white">Opname Stok Harian</h3>
                <p className="text-xs text-surface-500 mt-0.5">Sesuaikan stok fisik di Gudang atau Display (Etalase) dengan sistem.</p>
              </div>
              <div className="flex bg-surface-100 dark:bg-surface-800 p-1 rounded-xl">
                <button
                  onClick={() => setOpnameTipe('gudang')}
                  className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
                    opnameTipe === 'gudang' 
                      ? 'bg-white dark:bg-surface-900 text-orange-600 shadow-sm' 
                      : 'text-surface-500 hover:text-surface-700'
                  }`}
                >
                  Area Gudang
                </button>
                <button
                  onClick={() => setOpnameTipe('display')}
                  className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
                    opnameTipe === 'display' 
                      ? 'bg-white dark:bg-surface-900 text-orange-600 shadow-sm' 
                      : 'text-surface-500 hover:text-surface-700'
                  }`}
                >
                  Area Display
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
              {barangList.map(barang => {
                const opItemIndex = opnameItems.findIndex(oi => oi.barang_id === barang.id);
                if (opItemIndex === -1) return null;
                const opItem = opnameItems[opItemIndex];
                const selisih = opItem.stok_fisik - opItem.stok_sistem;
                
                return (
                  <div key={barang.id} className="bg-surface-50 dark:bg-surface-800/50 p-3 sm:p-4 rounded-xl border border-surface-200 dark:border-surface-700 flex flex-col gap-3 transition-colors hover:border-orange-500/30">
                    <div>
                      <div className="font-bold text-surface-900 dark:text-white line-clamp-1" title={barang.nama_barang}>{barang.nama_barang}</div>
                      <div className="text-[10px] text-surface-500 mt-0.5">{barang.kategori} &bull; per {barang.satuan_kecil}</div>
                    </div>
                    <div className="flex items-center justify-between border-t border-surface-200 dark:border-surface-700 pt-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-surface-500 font-semibold uppercase tracking-wider mb-1">Sistem</span>
                        <span className="font-semibold text-surface-700 dark:text-surface-300 text-sm">
                          {opItem.stok_sistem}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-surface-500 font-semibold uppercase tracking-wider mb-1">Fisik</span>
                          <input
                            type="number"
                            min="0"
                            value={opItem.stok_fisik === 0 && opItem.stok_sistem === 0 ? '' : opItem.stok_fisik}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              const newItems = [...opnameItems];
                              newItems[opItemIndex].stok_fisik = val;
                              setOpnameItems(newItems);
                            }}
                            className="w-16 sm:w-20 text-center px-2 py-1.5 bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div className="flex flex-col items-center justify-end h-full">
                          <span className="text-[10px] text-transparent select-none mb-1">-</span>
                          <div className={`flex items-center justify-center w-8 h-[34px] rounded-lg font-bold text-xs ${
                            selisih === 0 ? 'bg-surface-200 dark:bg-surface-700 text-surface-500' :
                            selisih > 0 ? 'bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-400' :
                            'bg-danger-100 text-danger-700 dark:bg-danger-500/20 dark:text-danger-400'
                          }`}>
                            {selisih > 0 ? `+${selisih}` : selisih}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4 border-t border-surface-200 dark:border-surface-800">
              <button
                onClick={handleSimpanOpname}
                disabled={isOpnameSubmitting}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50"
              >
                {isOpnameSubmitting ? 'Menyimpan...' : `Simpan Opname ${opnameTipe === 'gudang' ? 'Gudang' : 'Display'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
