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
  PlusCircle,
  Trash2,
  LogOut,
  AlertTriangle,
  KeyRound,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { TokoBarang, TokoPenjualan, TokoPergerakanStok } from '@/types';
import GantiPasswordModal from '@/components/GantiPasswordModal';
import {
  getTokoBarangLocal,
  getTokoPenjualanLocal,
  getTokoPergerakanLocal,
  syncTokoDataFromCloud,
  pindahKeDisplayBatch,
  inputPenjualan,
  getClientUserName
} from '@/lib/toko-store';

export default function KasirTokoPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'kasir' | 'display' | 'riwayat'>('kasir');
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [usernameKey, setUsernameKey] = useState('');

  const [barangList, setBarangList] = useState<TokoBarang[]>([]);
  const [penjualanList, setPenjualanList] = useState<TokoPenjualan[]>([]);
  const [pergerakanList, setPergerakanList] = useState<TokoPergerakanStok[]>([]);

  const [showModalPindah, setShowModalPindah] = useState(false);
  const [pindahForm, setPindahForm] = useState<{ items: { barang_id: string; jumlah_satuan_kecil: number }[] }>({ items: [] });

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
    
    const savedTab = sessionStorage.getItem('toko_active_tab') as 'kasir' | 'display' | 'riwayat';
    if (savedTab) {
      setActiveTab(savedTab);
      sessionStorage.removeItem('toko_active_tab');
    }

    const storedUser = sessionStorage.getItem('demo_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUsernameKey(user.nomor || user.label);
    }
  }, []);

  // ── HANDLERS ──
  const handleSimpanPindah = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pindahForm.items.length === 0) return;

    const user = getClientUserName('Kasir');
    const res = await pindahKeDisplayBatch(pindahForm.items, user);

    if (res.success) {
      showToast('Berhasil pindah barang ke Display!');
      setShowModalPindah(false);
      loadData();
    } else {
      showToast(`Gagal: ${res.error}`);
    }
  };

  const handleLogout = () => {
    if (confirm('Yakin ingin keluar/logout dari Dashboard Kasir?')) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('demo_user');
        document.cookie = 'demo_user=; path=/; max-age=0';
        window.location.href = '/login';
      }
    }
  };

  return (
    <div className="space-y-6 w-full min-w-0 max-w-[800px] mx-auto animate-fade-in pb-12 pt-4 px-4 sm:px-0">
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-5 py-3.5 bg-surface-900 text-white rounded-2xl shadow-2xl border border-white/10 animate-fade-in text-sm font-medium">
          <Check className="w-4 h-4 text-success-400 flex-shrink-0" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white shadow-lg border border-surface-200 overflow-hidden flex-shrink-0">
            <img src="/logo.jpg" alt="Logo Toko" className="w-full h-full object-contain p-0.5 sm:p-1" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-surface-900 dark:text-white leading-tight">
              Toko Martinez
            </h1>
            <p className="text-[10px] sm:text-sm text-surface-700/60 dark:text-surface-200/50 mt-0.5 leading-tight">
              Kasir & Pengisian Etalase/Display
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button
            onClick={() => setShowPasswordModal(true)}
            title="Ganti Password"
            className="flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 rounded-xl hover:bg-surface-200 dark:hover:bg-surface-700 transition-all cursor-pointer border border-surface-200 dark:border-surface-700"
          >
            <KeyRound className="w-4 h-4" />
            <span className="hidden sm:inline font-semibold text-xs ml-2">Sandi</span>
          </button>
          <button
            onClick={handleLogout}
            title="Logout"
            className="flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-500/20 transition-all cursor-pointer border border-transparent"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline font-semibold text-xs ml-2">Logout</span>
          </button>
          <button
            onClick={() => handleSyncData(true)}
            disabled={isSyncing}
            title="Sync Data"
            className={`flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 rounded-xl shadow-sm transition-all border ${
              isSyncing
                ? 'bg-surface-100 dark:bg-surface-800 text-surface-400 border-surface-200 dark:border-surface-700'
                : 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-primary-600 dark:text-primary-400'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline font-bold text-xs ml-2">Sync</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1 bg-surface-100/50 dark:bg-surface-800/50 p-1 rounded-xl w-full">
        <button
          onClick={() => setActiveTab('kasir')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 sm:px-3 rounded-lg font-bold text-[9px] sm:text-xs transition-all text-center leading-tight ${
            activeTab === 'kasir'
              ? 'bg-white dark:bg-surface-900 text-blue-600 dark:text-blue-400 shadow-sm border border-surface-200/50 dark:border-surface-700/50'
              : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
          }`}
        >
          <ShoppingCart className="w-4 h-4 sm:w-3.5 sm:h-3.5 mx-auto sm:mx-0" />
          <span>POS Kasir</span>
        </button>
        <button
          onClick={() => setActiveTab('display')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 sm:px-3 rounded-lg font-bold text-[9px] sm:text-xs transition-all text-center leading-tight ${
            activeTab === 'display'
              ? 'bg-white dark:bg-surface-900 text-cyan-600 dark:text-cyan-400 shadow-sm border border-surface-200/50 dark:border-surface-700/50'
              : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4 sm:w-3.5 sm:h-3.5 mx-auto sm:mx-0" />
          <span>Isi Etalase</span>
        </button>
        <button
          onClick={() => setActiveTab('riwayat')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2 sm:px-3 rounded-lg font-bold text-[9px] sm:text-xs transition-all text-center leading-tight ${
            activeTab === 'riwayat'
              ? 'bg-white dark:bg-surface-900 text-purple-600 dark:text-purple-400 shadow-sm border border-surface-200/50 dark:border-surface-700/50'
              : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
          }`}
        >
          <History className="w-4 h-4 sm:w-3.5 sm:h-3.5 mx-auto sm:mx-0" />
          <span>Riwayat Jual</span>
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
          <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden p-4 sm:p-6 w-full">
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
            
            <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[500px] text-xs text-left">
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
                setPindahForm({ items: [{ barang_id: barangList[0]?.id || '', jumlah_satuan_kecil: 1 }] });
                setShowModalPindah(true);
              }}
              className="px-6 py-3 bg-white text-cyan-600 font-bold rounded-2xl shadow-lg hover:bg-cyan-50 transition-colors w-full sm:w-auto"
            >
              + Ambil dari Gudang
            </button>
          </div>

          <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 overflow-hidden w-full">
            {/* DESKTOP VIEW */}
            <div className="hidden sm:block w-full overflow-x-auto">
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
                      <span className="bg-surface-100 dark:bg-surface-800 px-3 py-1 rounded-lg text-surface-600 font-mono text-xs whitespace-nowrap">
                        {b.stok_gudang} {b.satuan_kecil}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 px-3 py-1 rounded-lg font-mono text-xs font-bold whitespace-nowrap">
                        {b.stok_display} {b.satuan_kecil}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>

            {/* MOBILE VIEW */}
            <div className="sm:hidden flex flex-col divide-y divide-surface-100 dark:divide-surface-800">
              {barangList.map(b => (
                <div key={b.id} className="p-4 flex flex-col gap-3">
                  <div className="font-bold text-sm text-surface-900 dark:text-white">{b.nama_barang}</div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 flex flex-col gap-1">
                      <span className="text-[10px] text-surface-500 uppercase font-semibold">Di Gudang</span>
                      <div className="bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 px-3 py-2 rounded-xl text-surface-600 dark:text-surface-300 font-mono text-xs font-bold text-center">
                        {b.stok_gudang} <span className="font-sans font-normal">{b.satuan_kecil}</span>
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <span className="text-[10px] text-cyan-600 dark:text-cyan-400 uppercase font-semibold">Di Display</span>
                      <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800/50 text-cyan-600 dark:text-cyan-400 px-3 py-2 rounded-xl font-mono text-xs font-bold text-center shadow-sm">
                        {b.stok_display} <span className="font-sans font-normal">{b.satuan_kecil}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL PINDAH KE DISPLAY */}
      {showModalPindah && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModalPindah(false)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-surface-900 rounded-3xl shadow-2xl animate-fade-in overflow-hidden flex flex-col max-h-[90vh]">
            <div className="h-1.5 flex-shrink-0 bg-gradient-to-r from-cyan-500 to-blue-500" />
            <div className="p-6 flex-1 overflow-y-auto">
              <h3 className="font-bold text-lg mb-4">Ambil dari Gudang ke Display</h3>
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

      <GantiPasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        username={usernameKey}
      />
    </div>
  );
}
