'use client';

// ============================================================
// Admin Toko Martinez Page — /admin/toko
// Manajemen Master Barang & Input Pembelian (Stok Gudang)
// ============================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import type { TokoBarang, TokoPergerakanStok, TokoPenjualan } from '@/types';
import {
  getTokoBarangLocal,
  getTokoPergerakanLocal,
  getTokoPenjualanLocal,
  syncTokoDataFromCloud,
  deleteTokoBarang,
  addPembelianBatchGudang,
  keluarkanBatchGudang,
  type PembelianItem,
  type KeluarkanItem,
} from '@/lib/toko-store';

export default function AdminTokoPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'master' | 'pembelian' | 'mutasi'>('master');
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const [showModalKeluarkan, setShowModalKeluarkan] = useState(false);
  const [keluarForm, setKeluarForm] = useState<{
    catatan: string;
    items: KeluarkanItem[];
  }>({
    catatan: '',
    items: [],
  });

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

      {/* ── Tabs Navigation ──────────────────────────────────── */}
      <div className="flex items-center gap-2 bg-surface-100/50 dark:bg-surface-800/50 p-1.5 rounded-2xl w-fit">
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
      </div>

      {/* ── TAB CONTENT: MASTER BARANG ──────────────────────── */}
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
            <h3 className="font-bold text-sm text-surface-900 dark:text-white mb-4">Riwayat Pembelian Gudang Terakhir</h3>
            <div className="space-y-4">
              {pergerakanList.filter(p => p.jenis_pergerakan === 'PEMBELIAN_GUDANG').length === 0 ? (
                <p className="text-xs text-surface-400">Belum ada riwayat pembelian.</p>
              ) : (
                Object.values(
                  pergerakanList
                    .filter(p => p.jenis_pergerakan === 'PEMBELIAN_GUDANG')
                    .reduce((acc, p) => {
                      // Gunakan nomor invoice sebagai key, fallback ke ID untuk legacy data
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
                .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
                .slice(0, 20)
                .map((invoice, idx) => (
                  <div key={idx} className="bg-surface-50 dark:bg-surface-800/50 rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden">
                    <div className="p-4 bg-surface-100/50 dark:bg-surface-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-200 dark:border-surface-700">
                      <div>
                        <h4 className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                          {invoice.nomor_invoice}
                        </h4>
                        <p className="text-[11px] text-surface-500 mt-0.5">
                          {new Date(invoice.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} • Oleh: {invoice.dibuat_oleh}
                        </p>
                        {invoice.catatan && (
                          <p className="text-[11px] text-surface-500 italic mt-1">"{invoice.catatan}"</p>
                        )}
                      </div>
                      <div className="text-right text-xs font-bold text-surface-700 dark:text-surface-300">
                        {invoice.items.length} Macam Barang
                      </div>
                    </div>
                    <div className="p-4 overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead>
                          <tr className="border-b border-surface-200 dark:border-surface-700">
                            <th className="pb-2 text-[10px] font-bold text-surface-400 uppercase tracking-wider">Nama Barang</th>
                            <th className="pb-2 text-[10px] font-bold text-surface-400 uppercase tracking-wider text-right">Qty</th>
                            <th className="pb-2 text-[10px] font-bold text-surface-400 uppercase tracking-wider text-right">Harga Satuan (Besar)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-100 dark:divide-surface-800/50">
                          {invoice.items.map(p => {
                            const brg = barangList.find(b => b.id === p.barang_id);
                            return (
                              <tr key={p.id}>
                                <td className="py-2 text-xs font-medium text-surface-900 dark:text-white">
                                  {brg?.nama_barang || 'Barang Terhapus'}
                                </td>
                                <td className="py-2 text-xs text-right font-medium text-indigo-600 dark:text-indigo-400">
                                  +{p.jumlah_satuan_besar} {brg?.satuan_besar || 'Dus'}
                                </td>
                                <td className="py-2 text-xs text-right text-surface-600 dark:text-surface-400 font-mono">
                                  Rp {(p.harga_beli_satuan_besar || 0).toLocaleString('id-ID')}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
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
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {[
                  ...pergerakanList.map(p => ({
                    id: p.id,
                    tanggal: p.created_at || new Date().toISOString(),
                    barang_id: p.barang_id,
                    jenis: p.jenis_pergerakan,
                    qtyBesar: p.jumlah_satuan_besar || 0,
                    qtyKecil: p.jumlah_satuan_kecil,
                    catatan: p.nomor_invoice || p.catatan || '-',
                    oleh: p.dibuat_oleh || 'System'
                  })),
                  ...penjualanList.map(p => ({
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
                    </tr>
                  );
                })}
                {(pergerakanList.length === 0 && penjualanList.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-surface-400">Belum ada riwayat mutasi / transaksi.</td>
                  </tr>
                )}
              </tbody>
            </table>
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
    </div>
  );
}
