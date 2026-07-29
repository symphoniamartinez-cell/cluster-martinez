'use client';

// ============================================================
// Penjaga Clubhouse / Kasir Toko Martinez — /toko
// Pindah Stok ke Display & Penjualan Kasir
// ============================================================

import { useState, useEffect } from 'react';
import {
  Store,
  ShoppingCart,
  ArrowRightLeft,
  Check,
  RefreshCw,
  History,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { TokoBarang, TokoPenjualan, TokoPergerakanStok } from '@/types';
import {
  getTokoBarangLocal,
  getTokoPenjualanLocal,
  getTokoPergerakanLocal,
  syncTokoDataFromCloud,
  pindahKeDisplay,
  inputPenjualan,
} from '@/lib/toko-store';

export default function KasirTokoPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'kasir' | 'display' | 'riwayat'>('kasir');
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [barangList, setBarangList] = useState<TokoBarang[]>([]);
  const [penjualanList, setPenjualanList] = useState<TokoPenjualan[]>([]);
  const [pergerakanList, setPergerakanList] = useState<TokoPergerakanStok[]>([]);

  const [showModalPindah, setShowModalPindah] = useState(false);
  const [pindahForm, setPindahForm] = useState({ barang_id: '', jumlah: 1 });

  const [searchRiwayat, setSearchRiwayat] = useState('');
  const [detailInvoice, setDetailInvoice] = useState<{
    nomor_invoice: string;
    tanggal: string;
    nama_pelanggan: string;
    dijual_oleh: string;
    items: TokoPenjualan[];
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = () => {
    setBarangList(getTokoBarangLocal());
    setPenjualanList(getTokoPenjualanLocal());
    setPergerakanList(getTokoPergerakanLocal());
  };

  const handleSyncData = async (showNotification = true) => {
    setIsSyncing(true);
    const res = await syncTokoDataFromCloud();
    if (res.success) {
      loadData();
      if (showNotification) showToast('Data berhasil disinkronisasi!');
    } else {
      if (showNotification) showToast(`Gagal sinkronisasi: ${res.error}`);
    }
    setIsSyncing(false);
  };

  useEffect(() => {
    loadData();
    handleSyncData(false);
  }, []);

  // ── HANDLERS ──
  const handleSimpanPindah = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pindahForm.barang_id || pindahForm.jumlah <= 0) return;

    const user = JSON.parse(sessionStorage.getItem('demo_user') || '{}').label || 'Kasir';
    const res = await pindahKeDisplay(pindahForm.barang_id, pindahForm.jumlah, user);

    if (res.success) {
      showToast('Berhasil pindah barang ke Display!');
      setShowModalPindah(false);
      loadData();
    } else {
      showToast(`Gagal: ${res.error}`);
    }
  };

  return (
    <div className="space-y-6 max-w-[800px] mx-auto animate-fade-in pb-12 pt-4 px-4 sm:px-0">
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-5 py-3.5 bg-surface-900 text-white rounded-2xl shadow-2xl border border-white/10 animate-fade-in text-sm font-medium">
          <Check className="w-4 h-4 text-success-400 flex-shrink-0" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/20">
            <Store className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-surface-900 dark:text-white">
              Toko Martinez
            </h1>
            <p className="text-sm text-surface-700/60 dark:text-surface-200/50 mt-0.5">
              Kasir & Pengisian Etalase/Display
            </p>
          </div>
        </div>

        <button
          onClick={() => handleSyncData(true)}
          disabled={isSyncing}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-xl shadow-sm transition-all border ${
            isSyncing
              ? 'bg-surface-100 dark:bg-surface-800 text-surface-400 border-surface-200 dark:border-surface-700'
              : 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-primary-600 dark:text-primary-400'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          Sync
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-surface-100/50 dark:bg-surface-800/50 p-1.5 rounded-2xl w-full sm:w-fit overflow-x-auto">
        <button
          onClick={() => setActiveTab('kasir')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'kasir'
              ? 'bg-white dark:bg-surface-900 text-blue-600 dark:text-blue-400 shadow-sm border border-surface-200/50 dark:border-surface-700/50'
              : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          Kasir Penjualan
        </button>
        <button
          onClick={() => setActiveTab('display')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'display'
              ? 'bg-white dark:bg-surface-900 text-cyan-600 dark:text-cyan-400 shadow-sm border border-surface-200/50 dark:border-surface-700/50'
              : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          Isi Etalase
        </button>
        <button
          onClick={() => setActiveTab('riwayat')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'riwayat'
              ? 'bg-white dark:bg-surface-900 text-purple-600 dark:text-purple-400 shadow-sm border border-surface-200/50 dark:border-surface-700/50'
              : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
          }`}
        >
          <History className="w-4 h-4" />
          Riwayat Penjualan
        </button>
      </div>

      {/* TAB: KASIR */}
      {activeTab === 'kasir' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Input Penjualan Hari Ini</h2>
              <p className="text-white/80 text-sm mt-1">Stok akan langsung berkurang dari Display.</p>
            </div>
            <button
              onClick={() => router.push('/toko/kasir')}
              className="px-6 py-3 bg-white text-blue-600 font-bold rounded-2xl shadow-lg hover:bg-blue-50 transition-colors w-full sm:w-auto"
            >
              Buka Mesin Kasir
            </button>
          </div>

        </div>
      )}

      {/* TAB: RIWAYAT PENJUALAN */}
      {activeTab === 'riwayat' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h3 className="font-bold text-sm text-surface-900 dark:text-white">Riwayat Penjualan (Struk)</h3>
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Cari Invoice / Pelanggan..."
                  value={searchRiwayat}
                  onChange={e => setSearchRiwayat(e.target.value)}
                  className="w-full px-4 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
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
                  {penjualanList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-surface-400">Belum ada riwayat penjualan.</td>
                    </tr>
                  ) : (
                    Object.values(
                      penjualanList.reduce((acc, p) => {
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
                    .slice(0, 50)
                    .map((invoice, idx) => {
                      const totalNominal = invoice.items.reduce((sum, item) => sum + item.total_harga, 0);
                      return (
                        <tr key={idx} className="hover:bg-surface-50 dark:hover:bg-surface-800/50">
                          <td className="px-4 py-3 font-medium text-surface-900 dark:text-white">
                            {new Date(invoice.tanggal).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline" onClick={() => setDetailInvoice(invoice)}>
                            {invoice.nomor_invoice}
                          </td>
                          <td className="px-4 py-3 text-surface-700 dark:text-surface-300">
                            {invoice.nama_pelanggan}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-success-600 dark:text-success-400">
                            Rp {totalNominal.toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setDetailInvoice(invoice)}
                              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 font-bold rounded-lg transition-colors"
                            >
                              Detail
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: ISI ETALASE (PINDAH DARI GUDANG) */}
      {activeTab === 'display' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-cyan-500 to-teal-500 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Pindah Barang ke Depan</h2>
              <p className="text-white/80 text-sm mt-1">Pindahkan stok dari gudang ke kulkas / rak etalase depan.</p>
            </div>
            <button
              onClick={() => {
                setPindahForm({ barang_id: barangList[0]?.id || '', jumlah: 1 });
                setShowModalPindah(true);
              }}
              className="px-6 py-3 bg-white text-cyan-600 font-bold rounded-2xl shadow-lg hover:bg-cyan-50 transition-colors w-full sm:w-auto"
            >
              + Ambil dari Gudang
            </button>
          </div>

          <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-50 dark:bg-surface-800">
                <tr>
                  <th className="px-4 py-3 font-semibold text-surface-500">Barang (Ecer)</th>
                  <th className="px-4 py-3 font-semibold text-surface-500 text-center">Di Gudang</th>
                  <th className="px-4 py-3 font-semibold text-surface-500 text-center">Di Display</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                {barangList.map(b => (
                  <tr key={b.id}>
                    <td className="px-4 py-3 font-bold">{b.nama_barang}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-surface-100 dark:bg-surface-800 px-2 py-1 rounded-lg text-surface-600 font-mono text-xs">
                        {b.stok_gudang} {b.satuan_kecil}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 px-2 py-1 rounded-lg font-mono text-xs font-bold">
                        {b.stok_display} {b.satuan_kecil}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL PINDAH KE DISPLAY */}
      {showModalPindah && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModalPindah(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-surface-900 rounded-3xl p-6 shadow-2xl animate-fade-in">
            <h3 className="font-bold text-lg mb-4">Ambil dari Gudang ke Display</h3>
            <form onSubmit={handleSimpanPindah} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Pilih Barang</label>
                <select
                  required
                  value={pindahForm.barang_id}
                  onChange={e => setPindahForm({ ...pindahForm, barang_id: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-50 dark:bg-surface-800 rounded-xl"
                >
                  {barangList.map(b => (
                    <option key={b.id} value={b.id}>{b.nama_barang} (Gudang: {b.stok_gudang} {b.satuan_kecil})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Jumlah Pindah ({barangList.find(b => b.id === pindahForm.barang_id)?.satuan_kecil})
                </label>
                <input
                  type="number"
                  required min={1}
                  value={pindahForm.jumlah}
                  onChange={e => setPindahForm({ ...pindahForm, jumlah: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 bg-surface-50 dark:bg-surface-800 rounded-xl text-lg font-bold"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModalPindah(false)} className="flex-1 py-3 bg-surface-100 rounded-xl font-bold text-surface-600">Batal</button>
                <button type="submit" className="flex-1 py-3 bg-cyan-600 text-white rounded-xl font-bold">Pindahkan</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: DETAIL INVOICE PENJUALAN */}
      {detailInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDetailInvoice(null)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-surface-900 rounded-3xl shadow-2xl border border-surface-200 dark:border-surface-800 animate-fade-in overflow-hidden flex flex-col max-h-[90vh]">
            <div className="h-1.5 flex-shrink-0 bg-gradient-to-r from-indigo-500 to-purple-500" />
            <div className="p-6 flex-shrink-0 flex items-start justify-between border-b border-surface-100 dark:border-surface-800">
              <div>
                <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-1">
                  Detail Penjualan: <span className="text-indigo-600 dark:text-indigo-400">{detailInvoice.nomor_invoice}</span>
                </h3>
                <p className="text-xs text-surface-500">
                  {new Date(detailInvoice.tanggal).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} • Kasir: {detailInvoice.dijual_oleh}
                </p>
                <div className="mt-3 px-3 py-2 bg-surface-50 dark:bg-surface-800 rounded-xl inline-block">
                  <span className="text-xs text-surface-500">Pelanggan:</span>
                  <span className="ml-2 text-sm font-bold text-surface-900 dark:text-white">{detailInvoice.nama_pelanggan}</span>
                </div>
              </div>
              <button
                onClick={() => setDetailInvoice(null)}
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
                  {detailInvoice.items.map(p => {
                    const brg = barangList.find(b => b.id === p.barang_id);
                    return (
                      <tr key={p.id} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/30">
                        <td className="px-6 py-3 font-medium text-surface-900 dark:text-white">
                          {brg?.nama_barang || 'Barang Terhapus'}
                        </td>
                        <td className="px-6 py-3 text-right font-medium text-indigo-600 dark:text-indigo-400">
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
               <button onClick={() => setDetailInvoice(null)} className="px-5 py-2.5 bg-surface-200 hover:bg-surface-300 dark:bg-surface-700 dark:hover:bg-surface-600 rounded-xl font-bold transition-colors cursor-pointer">Tutup</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
