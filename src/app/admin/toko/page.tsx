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
import type { TokoBarang, TokoPergerakanStok } from '@/types';
import {
  getTokoBarangLocal,
  getTokoPergerakanLocal,
  syncTokoDataFromCloud,
  deleteTokoBarang,
  addPembelianGudang,
  keluarkanGudang,
} from '@/lib/toko-store';

export default function AdminTokoPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'master' | 'pembelian'>('master');
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [barangList, setBarangList] = useState<TokoBarang[]>([]);
  const [pergerakanList, setPergerakanList] = useState<TokoPergerakanStok[]>([]);

  // ── MODAL STATES ──
  const [showModalBeli, setShowModalBeli] = useState(false);
  const [beliForm, setBeliForm] = useState({
    barang_id: '',
    jumlah_satuan_besar: 1,
    catatan: '',
  });

  const [showModalKeluarkan, setShowModalKeluarkan] = useState(false);
  const [keluarForm, setKeluarForm] = useState({
    barang_id: '',
    jumlah_satuan_besar: 1,
    catatan: '',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = () => {
    setBarangList(getTokoBarangLocal());
    setPergerakanList(getTokoPergerakanLocal());
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
    if (!beliForm.barang_id || beliForm.jumlah_satuan_besar <= 0) return;

    const user = JSON.parse(sessionStorage.getItem('demo_user') || '{}').label || 'Admin';
    const res = await addPembelianGudang(
      beliForm.barang_id,
      beliForm.jumlah_satuan_besar,
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

  const handleKeluarkanBarang = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keluarForm.barang_id || keluarForm.jumlah_satuan_besar <= 0) return;

    const user = JSON.parse(sessionStorage.getItem('demo_user') || '{}').label || 'Admin';
    const res = await keluarkanGudang(
      keluarForm.barang_id,
      keluarForm.jumlah_satuan_besar,
      keluarForm.catatan,
      user
    );

    if (res.success) {
      showToast('Barang berhasil dikeluarkan dari Gudang!');
      setShowModalKeluarkan(false);
      loadData();
    } else {
      showToast(`Gagal mengeluarkan barang: ${res.error}`);
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
                  setKeluarForm({ barang_id: barangList[0]?.id || '', jumlah_satuan_besar: 1, catatan: '' });
                  setShowModalKeluarkan(true);
                }}
                className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap border border-white/20"
              >
                - Keluarkan Stok
              </button>
              <button
                onClick={() => {
                  setBeliForm({ barang_id: barangList[0]?.id || '', jumlah_satuan_besar: 1, catatan: '' });
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
            <div className="space-y-3">
              {pergerakanList.filter(p => p.jenis_pergerakan === 'PEMBELIAN_GUDANG').length === 0 ? (
                <p className="text-xs text-surface-400">Belum ada riwayat pembelian.</p>
              ) : (
                pergerakanList
                  .filter(p => p.jenis_pergerakan === 'PEMBELIAN_GUDANG')
                  .slice(0, 10)
                  .map(p => {
                    const brg = barangList.find(b => b.id === p.barang_id);
                    return (
                      <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-surface-50 dark:bg-surface-800/50 rounded-2xl border border-surface-200 dark:border-surface-700">
                        <div>
                          <p className="text-xs font-bold text-surface-900 dark:text-white">
                            {brg?.nama_barang || 'Barang Dihapus'}
                          </p>
                          <p className="text-[11px] text-surface-500 mt-0.5">
                            Oleh: {p.dibuat_oleh} • {new Date(p.created_at || '').toLocaleString('id-ID')}
                          </p>
                          {p.catatan && (
                            <p className="text-[11px] text-surface-400 italic mt-1">"{p.catatan}"</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            +{p.jumlah_satuan_besar} {brg?.satuan_besar || 'Dus'}
                          </p>
                          <p className="text-[10px] text-surface-500 font-mono">
                            (= {p.jumlah_satuan_kecil} {brg?.satuan_kecil || 'Pcs'})
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

      {/* ── MODALS ── */}
      {showModalBeli && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModalBeli(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-3xl shadow-2xl border border-surface-200 dark:border-surface-800 animate-fade-in overflow-hidden">
            <div className="h-1.5 flex-shrink-0 bg-gradient-to-r from-indigo-500 to-purple-500" />
            <div className="p-6 text-xs">
              <h3 className="text-base font-bold text-surface-900 dark:text-white mb-4">Input Pembelian (Gudang)</h3>
              
              <form onSubmit={handleSimpanPembelian} className="space-y-4">
                <div>
                  <label className="block font-semibold mb-1">Pilih Barang</label>
                  <select
                    required
                    value={beliForm.barang_id}
                    onChange={e => setBeliForm({ ...beliForm, barang_id: e.target.value })}
                    className="w-full px-4 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl"
                  >
                    <option value="">-- Pilih Barang --</option>
                    {barangList.map(b => (
                      <option key={b.id} value={b.id}>{b.nama_barang}</option>
                    ))}
                  </select>
                </div>
                
                {beliForm.barang_id && (
                  <div>
                    <label className="block font-semibold mb-1">
                      Jumlah Beli ({barangList.find(b => b.id === beliForm.barang_id)?.satuan_besar})
                    </label>
                    <input
                      type="number"
                      required min={1}
                      value={beliForm.jumlah_satuan_besar}
                      onChange={e => setBeliForm({ ...beliForm, jumlah_satuan_besar: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-semibold mb-1">Catatan / Supplier (Opsional)</label>
                  <input
                    type="text"
                    value={beliForm.catatan}
                    onChange={e => setBeliForm({ ...beliForm, catatan: e.target.value })}
                    placeholder="Beli dari Grosir A"
                    className="w-full px-4 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-surface-100 dark:border-surface-800">
                  <button type="button" onClick={() => setShowModalBeli(false)} className="px-4 py-2 bg-surface-100 dark:bg-surface-800 rounded-xl font-bold cursor-pointer">
                    Batal
                  </button>
                  <button type="submit" className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-bold cursor-pointer shadow-md hover:brightness-110">
                    Masukkan ke Gudang
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
          <div className="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-3xl shadow-2xl border border-surface-200 dark:border-surface-800 animate-fade-in overflow-hidden">
            <div className="h-1.5 flex-shrink-0 bg-gradient-to-r from-red-500 to-orange-500" />
            <div className="p-6 text-xs">
              <h3 className="text-base font-bold text-surface-900 dark:text-white mb-4">Keluarkan Stok dari Gudang</h3>
              
              <form onSubmit={handleKeluarkanBarang} className="space-y-4">
                <div>
                  <label className="block font-semibold mb-1">Pilih Barang</label>
                  <select
                    required
                    value={keluarForm.barang_id}
                    onChange={e => setKeluarForm({ ...keluarForm, barang_id: e.target.value })}
                    className="w-full px-4 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl"
                  >
                    <option value="">-- Pilih Barang --</option>
                    {barangList.map(b => (
                      <option key={b.id} value={b.id}>{b.nama_barang} (Sisa: {b.stok_gudang} {b.satuan_kecil})</option>
                    ))}
                  </select>
                </div>
                
                {keluarForm.barang_id && (
                  <div>
                    <label className="block font-semibold mb-1">
                      Jumlah Dikeluarkan ({barangList.find(b => b.id === keluarForm.barang_id)?.satuan_besar})
                    </label>
                    <input
                      type="number"
                      required min={1}
                      value={keluarForm.jumlah_satuan_besar}
                      onChange={e => setKeluarForm({ ...keluarForm, jumlah_satuan_besar: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-semibold mb-1">Catatan / Alasan</label>
                  <input
                    type="text"
                    required
                    value={keluarForm.catatan}
                    onChange={e => setKeluarForm({ ...keluarForm, catatan: e.target.value })}
                    placeholder="Sumbangan lomba agustusan..."
                    className="w-full px-4 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-surface-100 dark:border-surface-800">
                  <button type="button" onClick={() => setShowModalKeluarkan(false)} className="px-4 py-2 bg-surface-100 dark:bg-surface-800 rounded-xl font-bold cursor-pointer">
                    Batal
                  </button>
                  <button type="submit" className="px-5 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-bold cursor-pointer shadow-md hover:brightness-110">
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
