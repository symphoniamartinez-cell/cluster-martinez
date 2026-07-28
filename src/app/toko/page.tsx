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
} from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'kasir' | 'display'>('kasir');
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [barangList, setBarangList] = useState<TokoBarang[]>([]);
  const [penjualanList, setPenjualanList] = useState<TokoPenjualan[]>([]);
  const [pergerakanList, setPergerakanList] = useState<TokoPergerakanStok[]>([]);

  const [showModalJual, setShowModalJual] = useState(false);
  const [jualForm, setJualForm] = useState({ barang_id: '', jumlah: 1 });

  const [showModalPindah, setShowModalPindah] = useState(false);
  const [pindahForm, setPindahForm] = useState({ barang_id: '', jumlah: 1 });

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
  const handleSimpanPenjualan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jualForm.barang_id || jualForm.jumlah <= 0) return;

    const user = JSON.parse(sessionStorage.getItem('demo_user') || '{}').label || 'Kasir';
    const res = await inputPenjualan(jualForm.barang_id, jualForm.jumlah, user);

    if (res.success) {
      showToast('Penjualan berhasil dicatat!');
      setShowModalJual(false);
      loadData();
    } else {
      showToast(`Gagal: ${res.error}`);
    }
  };

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
              onClick={() => {
                setJualForm({ barang_id: barangList[0]?.id || '', jumlah: 1 });
                setShowModalJual(true);
              }}
              className="px-6 py-3 bg-white text-blue-600 font-bold rounded-2xl shadow-lg hover:bg-blue-50 transition-colors w-full sm:w-auto"
            >
              + Catat Penjualan
            </button>
          </div>

          <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 p-6">
            <h3 className="font-bold text-sm mb-4">Riwayat Penjualan Terakhir</h3>
            <div className="space-y-3">
              {penjualanList.length === 0 ? (
                <p className="text-xs text-surface-400">Belum ada penjualan.</p>
              ) : (
                penjualanList.slice(0, 10).map(p => {
                  const brg = barangList.find(b => b.id === p.barang_id);
                  return (
                    <div key={p.id} className="flex justify-between items-center p-3 bg-surface-50 dark:bg-surface-800 rounded-2xl border border-surface-100 dark:border-surface-700">
                      <div>
                        <p className="font-bold text-sm">{brg?.nama_barang || 'Barang Terhapus'}</p>
                        <p className="text-xs text-surface-500">{new Date(p.created_at || '').toLocaleTimeString('id-ID')} • Kasir: {p.dijual_oleh}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-success-600 dark:text-success-400">
                          Rp {p.total_harga.toLocaleString('id-ID')}
                        </p>
                        <p className="text-xs text-surface-500">
                          {p.jumlah_satuan_kecil} {brg?.satuan_kecil || 'Pcs'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
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

      {/* MODAL JUAL */}
      {showModalJual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModalJual(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-surface-900 rounded-3xl p-6 shadow-2xl animate-fade-in">
            <h3 className="font-bold text-lg mb-4">Catat Penjualan</h3>
            <form onSubmit={handleSimpanPenjualan} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Barang Terjual</label>
                <select
                  required
                  value={jualForm.barang_id}
                  onChange={e => setJualForm({ ...jualForm, barang_id: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-50 dark:bg-surface-800 rounded-xl"
                >
                  {barangList.map(b => (
                    <option key={b.id} value={b.id}>{b.nama_barang} (Sisa: {b.stok_display} {b.satuan_kecil})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Jumlah Terjual ({barangList.find(b => b.id === jualForm.barang_id)?.satuan_kecil})
                </label>
                <input
                  type="number"
                  required min={1}
                  value={jualForm.jumlah}
                  onChange={e => setJualForm({ ...jualForm, jumlah: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 bg-surface-50 dark:bg-surface-800 rounded-xl text-lg font-bold"
                />
              </div>
              {jualForm.barang_id && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
                  <p className="text-xs text-blue-600 dark:text-blue-400">Total Harga</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    Rp {((barangList.find(b => b.id === jualForm.barang_id)?.harga_jual_satuan_kecil || 0) * jualForm.jumlah).toLocaleString('id-ID')}
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModalJual(false)} className="flex-1 py-3 bg-surface-100 rounded-xl font-bold text-surface-600">Batal</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PINDAH */}
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
    </div>
  );
}
