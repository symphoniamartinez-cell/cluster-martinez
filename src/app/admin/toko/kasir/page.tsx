'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Store,
  ShoppingCart,
  ArrowLeft,
  Check,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import type { TokoBarang, TokoPelanggan } from '@/types';
import {
  getTokoBarangLocal,
  getTokoPelangganLocal,
  inputPenjualanBatch,
  getClientUserName,
  type PenjualanItem
} from '@/lib/toko-store';

export default function AdminKasirPOSPage() {
  const router = useRouter();
  const [barangList, setBarangList] = useState<TokoBarang[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const [cart, setCart] = useState<PenjualanItem[]>([]);
  const [pelangganList, setPelangganList] = useState<TokoPelanggan[]>([]);
  const [selectedPelangganId, setSelectedPelangganId] = useState('');
  const [namaPelangganManual, setNamaPelangganManual] = useState('');
  const [metodePembayaran, setMetodePembayaran] = useState<'CASH' | 'SALDO'>('CASH');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const list = getTokoBarangLocal();
    setBarangList(list);
    setPelangganList(getTokoPelangganLocal());
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAddRow = () => {
    if (barangList.length > 0) {
      setCart([...cart, { barang_id: barangList[0].id, jumlah_satuan_kecil: 1 }]);
    }
  };

  const handleRemoveRow = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const handleItemChange = (index: number, field: keyof PenjualanItem, value: any) => {
    const newCart = [...cart];
    newCart[index] = { ...newCart[index], [field]: value };
    setCart(newCart);
  };

  const totalBelanja = cart.reduce((sum, item) => {
    const brg = barangList.find(b => b.id === item.barang_id);
    const hargaSatuan = item.harga_satuan_custom !== undefined ? item.harga_satuan_custom : (brg?.harga_jual_satuan_kecil || 0);
    return sum + (item.jumlah_satuan_kecil * hargaSatuan);
  }, 0);

  const totalItem = cart.reduce((sum, item) => sum + (item.jumlah_satuan_kecil || 0), 0);

  const handleBayar = async () => {
    const validItems = cart.filter(c => c.barang_id && c.jumlah_satuan_kecil > 0);
    if (validItems.length === 0) {
      alert('Keranjang kosong atau jumlah tidak valid.');
      return;
    }

    // Validate stok
    for (const item of validItems) {
      const brg = barangList.find(b => b.id === item.barang_id);
      const requested = validItems.filter(v => v.barang_id === item.barang_id).reduce((s, v) => s + v.jumlah_satuan_kecil, 0);
      if (brg && (brg.stok_display || 0) < requested) {
        alert(`Stok Display untuk ${brg?.nama_barang || 'Barang'} tidak mencukupi. Sisa: ${brg?.stok_display || 0}`);
        return;
      }
    }

    setIsSubmitting(true);
    const user = getClientUserName('Admin');
    const selectedPelanggan = pelangganList.find(p => p.id === selectedPelangganId);
    const finalNamaPelanggan = selectedPelanggan ? selectedPelanggan.nama : namaPelangganManual;
    
    const res = await inputPenjualanBatch(validItems, user, finalNamaPelanggan, selectedPelangganId, metodePembayaran);
    
    if (res.success) {
      showToast('Transaksi berhasil dibayar & dicatat!');
      // Reset form
      setCart([]);
      setSelectedPelangganId('');
      setNamaPelangganManual('');
      setMetodePembayaran('CASH');
      // Refresh stok local
      setBarangList(getTokoBarangLocal());
      
      // Redirect to riwayat tab
      sessionStorage.setItem('toko_active_tab', 'riwayat');
      setTimeout(() => {
        router.push('/admin/toko');
      }, 800);
    } else {
      alert(`Gagal memproses transaksi: ${res.error}`);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6 w-full min-w-0 max-w-[1000px] mx-auto animate-fade-in pb-12 pt-4 px-4 sm:px-0">
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-5 py-3.5 bg-surface-900 text-white rounded-2xl shadow-2xl border border-white/10 animate-fade-in text-sm font-medium">
          <Check className="w-4 h-4 text-success-400 flex-shrink-0" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/admin/toko')}
            className="w-10 h-10 flex items-center justify-center bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-surface-600 dark:text-surface-300" />
          </button>
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-success-500 to-emerald-500 shadow-lg shadow-success-500/20">
            <ShoppingCart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-surface-900 dark:text-white">
              Point of Sale (Admin)
            </h1>
            <p className="text-sm text-surface-700/60 dark:text-surface-200/50 mt-0.5">
              Catat penjualan ke warga & ubah harga manual
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Kiri: Daftar Keranjang */}
        <div className="flex-1 space-y-4">
          <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-sm text-surface-900 dark:text-white mb-2">Informasi Pelanggan (Opsional)</h3>
            
            <div>
              <label className="block text-xs font-bold text-surface-700 dark:text-surface-300 mb-1.5">Pilih Pelanggan Terdaftar</label>
              <select
                value={selectedPelangganId}
                onChange={e => setSelectedPelangganId(e.target.value)}
                className="w-full px-4 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-success-500/50"
              >
                <option value="">-- Bukan Pelanggan Terdaftar --</option>
                {pelangganList.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nama} (Saldo: Rp {p.saldo_titipan.toLocaleString('id-ID')})
                  </option>
                ))}
              </select>
            </div>

            {!selectedPelangganId && (
              <div>
                <label className="block text-xs font-bold text-surface-700 dark:text-surface-300 mb-1.5">Atau Ketik Nama Manual</label>
                <input
                  type="text"
                  placeholder="Nama pelanggan (contoh: Bpk. Budi, Blok A2)"
                  value={namaPelangganManual}
                  onChange={e => setNamaPelangganManual(e.target.value)}
                  className="w-full px-4 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-success-500/50"
                />
              </div>
            )}
            
            {selectedPelangganId && (
              <div>
                <label className="block text-xs font-bold text-surface-700 dark:text-surface-300 mb-1.5">Metode Pembayaran</label>
                <select
                  value={metodePembayaran}
                  onChange={e => setMetodePembayaran(e.target.value as any)}
                  className="w-full px-4 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm font-bold text-success-600 focus:outline-none focus:ring-2 focus:ring-success-500/50"
                >
                  <option value="CASH">CASH (Tunai/Transfer)</option>
                  <option value="SALDO">POTONG SALDO TITIPAN</option>
                </select>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden p-6">
            <h3 className="font-bold text-sm text-surface-900 dark:text-white mb-4 flex items-center gap-2">
              Keranjang Belanja
              <span className="px-2 py-0.5 bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-400 rounded-lg text-xs">
                {cart.length} Baris
              </span>
            </h3>
            
            <div className="space-y-3">
              {cart.map((item, index) => {
                const selectedBrg = barangList.find(b => b.id === item.barang_id);
                const subtotal = item.jumlah_satuan_kecil * (selectedBrg?.harga_jual_satuan_kecil || 0);
                
                return (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-start gap-3 p-4 bg-surface-50 dark:bg-surface-800/50 rounded-2xl border border-surface-200 dark:border-surface-700">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-surface-500 mb-1.5">Barang</label>
                      <select
                        value={item.barang_id}
                        onChange={e => {
                          const brgId = e.target.value;
                          const selected = barangList.find(b => b.id === brgId);
                          const newCart = [...cart];
                          newCart[index] = { ...newCart[index], barang_id: brgId, harga_satuan_custom: selected?.harga_jual_satuan_kecil };
                          setCart(newCart);
                        }}
                        className="w-full px-3 py-2.5 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-success-500/50 h-[42px]"
                      >
                        {barangList.map(b => (
                          <option key={b.id} value={b.id} disabled={(b.stok_display || 0) <= 0}>
                            {b.nama_barang}
                          </option>
                        ))}
                      </select>
                      {selectedBrg && (
                        <div className="mt-2 text-[11px] text-surface-500 font-medium">
                          Sisa Stok: <span className={((selectedBrg.stok_display || 0) > 0) ? "text-success-600 dark:text-success-400" : "text-red-500"}>{selectedBrg.stok_display || 0} {selectedBrg.satuan_kecil}</span> 
                          <span className="mx-1.5">•</span> 
                          Rp {(selectedBrg.harga_jual_satuan_kecil || 0).toLocaleString('id-ID')} / {selectedBrg.satuan_kecil}
                        </div>
                      )}
                    </div>
                    <div className="w-full sm:w-28">
                      <label className="block text-xs font-bold text-surface-500 mb-1.5">Qty</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          value={item.jumlah_satuan_kecil || ''}
                          onChange={e => handleItemChange(index, 'jumlah_satuan_kecil', parseInt(e.target.value) || 0)}
                          className="w-full pl-3 pr-10 py-2.5 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-success-500/50 h-[42px]"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-surface-400">
                          {selectedBrg?.satuan_kecil || 'Pcs'}
                        </span>
                      </div>
                    </div>
                    <div className="w-full sm:w-28">
                      <label className="block text-xs font-bold text-surface-500 mb-1.5">Harga</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={item.harga_satuan_custom !== undefined ? item.harga_satuan_custom : (selectedBrg?.harga_jual_satuan_kecil || 0)}
                          onChange={e => handleItemChange(index, 'harga_satuan_custom', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2.5 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-success-500/50 h-[42px]"
                        />
                      </div>
                    </div>
                    <div className="w-full sm:w-36">
                      <label className="block text-xs font-bold text-surface-500 mb-1.5">Subtotal</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-surface-500 font-bold">Rp</span>
                        <input
                          type="text"
                          readOnly
                          value={(item.jumlah_satuan_kecil * (item.harga_satuan_custom !== undefined ? item.harga_satuan_custom : (selectedBrg?.harga_jual_satuan_kecil || 0))).toLocaleString('id-ID')}
                          className="w-full pl-9 pr-3 py-2.5 bg-surface-100/50 dark:bg-surface-800 border border-transparent rounded-xl text-sm font-mono font-bold text-surface-900 dark:text-white focus:outline-none h-[42px]"
                        />
                      </div>
                    </div>
                    <div className="w-full sm:w-10">
                      <label className="hidden sm:block text-xs mb-1.5 opacity-0">X</label>
                      <button
                        onClick={() => handleRemoveRow(index)}
                        className="w-full sm:w-10 h-[42px] flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-xl transition-colors flex-shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleAddRow}
              className="mt-4 flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-3 border-2 border-dashed border-blue-500/40 text-blue-600 dark:text-blue-400 font-bold rounded-xl text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Tambah Baris Barang
            </button>
          </div>
        </div>

        {/* Kanan: Ringkasan & Bayar */}
        <div className="lg:w-80 flex-shrink-0">
          <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-sm p-6 sticky top-6">
            <h3 className="font-bold text-sm text-surface-900 dark:text-white mb-4">Total Tagihan</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-surface-500">Total Qty Brg</span>
                <span className="font-bold">{totalItem} unit</span>
              </div>
              <div className="pt-3 mt-3 border-t border-dashed border-surface-200 dark:border-surface-700">
                <div className="text-[10px] uppercase font-bold text-surface-400 mb-1">TOTAL BAYAR</div>
                <div className="text-3xl font-black text-success-600 dark:text-success-400 font-mono">
                  Rp {totalBelanja.toLocaleString('id-ID')}
                </div>
              </div>
            </div>

            <button
              onClick={handleBayar}
              disabled={cart.length === 0 || isSubmitting}
              className={`w-full py-4 rounded-2xl font-black text-base shadow-lg transition-all flex items-center justify-center gap-2 ${
                cart.length === 0 || isSubmitting
                  ? 'bg-surface-100 text-surface-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-success-500 to-emerald-500 text-white hover:brightness-110 shadow-success-500/25 cursor-pointer'
              }`}
            >
              {isSubmitting ? (
                'Memproses...'
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  INPUT PENJUALAN
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
