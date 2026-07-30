'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Box,
  Trash2
} from 'lucide-react';
import type { TokoBarang } from '@/types';
import {
  getTokoBarangLocal,
  getTokoPergerakanLocal,
  editPembelianInvoice,
  syncTokoDataFromCloud,
  type PembelianItem
} from '@/lib/toko-store';

export default function EditPembelianPage({ params }: { params: Promise<{ nomor_invoice: string }> }) {
  const router = useRouter();
  const { nomor_invoice } = use(params);
  const decodedInvoice = decodeURIComponent(nomor_invoice);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [barangList, setBarangList] = useState<TokoBarang[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  const [beliForm, setBeliForm] = useState<{
    nomor_invoice: string;
    tanggal: string;
    catatan: string;
    items: PembelianItem[];
  }>({
    nomor_invoice: decodedInvoice,
    tanggal: new Date().toISOString().slice(0, 10),
    catatan: '',
    items: [],
  });

  useEffect(() => {
    let name = 'Unknown';
    try {
      const sessionData = JSON.parse(sessionStorage.getItem('demo_user') || '{}');
      name = sessionData.label || localStorage.getItem('martinez_role') || 'Unknown';
    } catch (e) {
      name = localStorage.getItem('martinez_role') || 'Unknown';
    }
    setUserRole(name);

    const loadData = async () => {
      // Fetch latest from cloud to ensure local storage is up to date
      await syncTokoDataFromCloud();
      
      const bList = getTokoBarangLocal();
      setBarangList(bList);
      
      // Load existing invoice data
      const pList = getTokoPergerakanLocal();
      const invoiceItems = pList.filter(p => p.nomor_invoice === decodedInvoice && p.jenis_pergerakan === 'PEMBELIAN_GUDANG');
      
      if (invoiceItems.length > 0) {
        setBeliForm({
          nomor_invoice: decodedInvoice,
          tanggal: (invoiceItems[0].created_at || new Date().toISOString()).split('T')[0],
          catatan: invoiceItems[0].catatan || '',
          items: invoiceItems.map(p => {
            const isKecil = p.jumlah_satuan_besar === 0;
            const b = bList.find(x => x.id === p.barang_id);
            const qtyPerBesar = b?.qty_per_satuan_besar || 1;
            return {
              barang_id: p.barang_id,
              tipe_satuan: isKecil ? 'kecil' : 'besar',
              jumlah: isKecil ? p.jumlah_satuan_kecil : p.jumlah_satuan_besar,
              harga_beli_per_unit: isKecil ? ((p.harga_beli_satuan_besar || 0) / qtyPerBesar) : (p.harga_beli_satuan_besar || 0)
            };
          })
        });
      }
      setIsLoaded(true);
    };

    loadData();
  }, [decodedInvoice]);

  const handleSimpanPembelian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (beliForm.items.length === 0) return alert('Silakan tambahkan minimal 1 barang');
    
    setIsSyncing(true);
    const res = await editPembelianInvoice(
      beliForm.nomor_invoice,
      beliForm.items,
      beliForm.catatan,
      userRole
    );

    if (res.success) {
      alert('Pembelian berhasil diperbarui!');
      router.push('/admin/toko');
    } else {
      alert(`Gagal memperbarui pembelian: ${res.error}`);
    }
    setIsSyncing(false);
  };

  const getHargaSatuanKecil = (b: TokoBarang) => {
    return (b.harga_beli_satuan_besar || 0) / (b.qty_per_satuan_besar || 1);
  };

  if (!isLoaded) return <div className="p-8 text-center text-surface-500">Memuat data...</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in pb-24">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => router.back()}
          className="p-2 bg-white dark:bg-surface-900 rounded-full shadow-sm hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-surface-600 dark:text-surface-400" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-surface-900 dark:text-white flex items-center gap-2">
            <Box className="w-6 h-6 text-indigo-500" />
            Edit Pembelian Gudang
          </h1>
          <p className="text-surface-500 dark:text-surface-400 text-sm mt-1">
            Edit invoice {decodedInvoice}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-sm p-6 sm:p-8">
        <form onSubmit={handleSimpanPembelian} className="space-y-8">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block font-semibold mb-2">Catatan Tambahan (Opsional)</label>
              <input
                type="text"
                value={beliForm.catatan}
                onChange={e => setBeliForm({ ...beliForm, catatan: e.target.value })}
                placeholder="Beli dari Supplier A, dll..."
                className="w-full px-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Daftar Barang</h3>
              <button
                type="button"
                onClick={() => {
                  setBeliForm({
                    ...beliForm,
                    items: [...beliForm.items, { barang_id: '', tipe_satuan: 'besar', jumlah: 1, harga_beli_per_unit: 0 }]
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors text-sm"
              >
                + Tambah Baris
              </button>
            </div>
            
            {beliForm.items.length === 0 ? (
              <div className="text-center py-8 text-surface-500 border-2 border-dashed border-surface-200 dark:border-surface-800 rounded-2xl">
                Belum ada barang ditambahkan. Klik Tambah Baris.
              </div>
            ) : (
              <div className="space-y-3">
                {beliForm.items.map((item, index) => {
                  const b = barangList.find(x => x.id === item.barang_id);
                  const isKecil = item.tipe_satuan === 'kecil';
                  
                  return (
                    <div key={index} className="flex flex-col lg:flex-row items-start lg:items-center gap-3 p-4 bg-surface-50 dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700">
                      
                      {/* BARANG SELECT */}
                      <div className="w-full lg:flex-1">
                        <label className="block text-[11px] font-semibold text-surface-500 mb-1">Barang</label>
                        <select
                          required
                          value={item.barang_id}
                          onChange={e => {
                            const newItems = [...beliForm.items];
                            const selectedBarang = barangList.find(x => x.id === e.target.value);
                            newItems[index] = { 
                              ...newItems[index], 
                              barang_id: e.target.value,
                              harga_beli_per_unit: item.tipe_satuan === 'besar' 
                                ? (selectedBarang?.harga_beli_satuan_besar || 0)
                                : getHargaSatuanKecil(selectedBarang!)
                            };
                            setBeliForm({ ...beliForm, items: newItems });
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">-- Pilih --</option>
                          {barangList.map(bItem => (
                            <option key={bItem.id} value={bItem.id}>{bItem.nama_barang}</option>
                          ))}
                        </select>
                      </div>

                      {/* TIPE SATUAN SELECT */}
                      <div className="w-full lg:w-40">
                        <label className="block text-[11px] font-semibold text-surface-500 mb-1">Pilih Satuan</label>
                        <select
                          required
                          value={item.tipe_satuan}
                          onChange={e => {
                            const val = e.target.value as 'besar' | 'kecil';
                            const newItems = [...beliForm.items];
                            newItems[index].tipe_satuan = val;
                            if (b) {
                              newItems[index].harga_beli_per_unit = val === 'besar' 
                                ? (b.harga_beli_satuan_besar || 0)
                                : getHargaSatuanKecil(b);
                            }
                            setBeliForm({ ...beliForm, items: newItems });
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-indigo-600 dark:text-indigo-400"
                        >
                          <option value="besar">{b?.satuan_besar || 'Besar'}</option>
                          <option value="kecil">{b?.satuan_kecil || 'Kecil'}</option>
                        </select>
                      </div>
                      
                      {/* QUANTITY */}
                      <div className="w-full lg:w-32">
                        <label className="block text-[11px] font-semibold text-surface-500 mb-1">
                          Qty ({isKecil ? (b?.satuan_kecil || 'Kecil') : (b?.satuan_besar || 'Besar')})
                        </label>
                        <input
                          type="number"
                          required min={1}
                          value={item.jumlah}
                          onChange={e => {
                            const newItems = [...beliForm.items];
                            newItems[index].jumlah = parseInt(e.target.value) || 1;
                            setBeliForm({ ...beliForm, items: newItems });
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* HARGA */}
                      <div className="w-full lg:w-56">
                        <label className="block text-[11px] font-semibold text-surface-500 mb-1">
                          Harga Beli / {isKecil ? (b?.satuan_kecil || 'Kecil') : (b?.satuan_besar || 'Besar')}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 font-bold">Rp</span>
                          <input
                            type="number"
                            required min={0}
                            value={item.harga_beli_per_unit}
                            onChange={e => {
                              const newItems = [...beliForm.items];
                              newItems[index].harga_beli_per_unit = parseInt(e.target.value) || 0;
                              setBeliForm({ ...beliForm, items: newItems });
                            }}
                            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      {/* DELETE ROW */}
                      <div className="flex lg:pt-5">
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = [...beliForm.items];
                            newItems.splice(index, 1);
                            setBeliForm({ ...beliForm, items: newItems });
                          }}
                          className="p-2 text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/10 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4 pt-6 border-t border-surface-100 dark:border-surface-800">
            <div className="bg-surface-50 dark:bg-surface-800 px-6 py-4 rounded-2xl border border-surface-200 dark:border-surface-700 w-full sm:w-auto">
              <p className="text-surface-500 text-xs font-semibold uppercase tracking-wider mb-1">Total Pembelian</p>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                Rp {beliForm.items.reduce((sum, item) => sum + (item.jumlah * item.harga_beli_per_unit), 0).toLocaleString('id-ID')}
              </p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
            <button 
              type="button" 
              onClick={() => router.back()} 
              className="px-6 py-3 bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 rounded-xl font-bold hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
            >
              Batal
            </button>
            <button 
              type="submit" 
              disabled={isSyncing} 
              className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {isSyncing ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
