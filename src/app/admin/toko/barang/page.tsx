'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Store, Check, ArrowLeft } from 'lucide-react';
import type { TokoBarang } from '@/types';
import { getTokoBarangLocal, saveTokoBarang } from '@/lib/toko-store';

function BarangForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<TokoBarang>>({
    nama_barang: '',
    kategori: 'Umum',
    satuan_besar: 'Dus',
    satuan_kecil: 'Botol',
    qty_per_satuan_besar: 24,
    harga_beli_satuan_besar: 50000,
    harga_jual_satuan_kecil: 3000,
  });

  useEffect(() => {
    if (id) {
      const barang = getTokoBarangLocal().find(b => b.id === id);
      if (barang) {
        setFormData(barang);
      }
    }
  }, [id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSaveBarang = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_barang) return;

    const newBarang: TokoBarang = {
      id: formData.id || 'brg-' + Date.now(),
      nama_barang: formData.nama_barang,
      kategori: formData.kategori || 'Umum',
      satuan_besar: formData.satuan_besar || 'Dus',
      satuan_kecil: formData.satuan_kecil || 'Botol',
      qty_per_satuan_besar: formData.qty_per_satuan_besar || 1,
      harga_beli_satuan_besar: formData.harga_beli_satuan_besar || 0,
      harga_jual_satuan_kecil: formData.harga_jual_satuan_kecil || 0,
      stok_gudang: formData.stok_gudang || 0,
      stok_display: formData.stok_display || 0,
      created_at: formData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const res = await saveTokoBarang(newBarang);
    if (res.success) {
      showToast('Barang berhasil disimpan!');
      setTimeout(() => {
        router.push('/admin/toko');
      }, 1000);
    } else {
      showToast(`Gagal menyimpan: ${res.error}`);
    }
  };

  return (
    <div className="space-y-6 max-w-[800px] mx-auto animate-fade-in pb-12">
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-5 py-3.5 bg-surface-900 text-white rounded-2xl shadow-2xl border border-white/10 animate-fade-in text-sm font-medium">
          <Check className="w-4 h-4 text-success-400 flex-shrink-0" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/admin/toko')}
          className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-surface-500" />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/20">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-surface-900 dark:text-white">
              {id ? 'Edit Master Barang' : 'Tambah Master Barang'}
            </h1>
            <p className="text-sm text-surface-700/60 dark:text-surface-200/50 mt-0.5">
              Isi data barang, satuan, dan margin harga.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-surface-900 rounded-3xl shadow-xl border border-surface-200 dark:border-surface-800 overflow-hidden">
        <div className="h-1.5 flex-shrink-0 bg-gradient-to-r from-indigo-500 to-purple-500" />
        <div className="p-6 sm:p-8">
          <form onSubmit={handleSaveBarang} className="space-y-6 text-sm">
            <div>
              <label className="block font-semibold mb-2">Nama Barang</label>
              <input
                type="text"
                required
                value={formData.nama_barang}
                onChange={e => setFormData({ ...formData, nama_barang: e.target.value })}
                className="w-full px-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl font-bold"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block font-semibold mb-2">Satuan Beli (Gudang)</label>
                <input
                  type="text"
                  required
                  value={formData.satuan_besar}
                  onChange={e => setFormData({ ...formData, satuan_besar: e.target.value })}
                  placeholder="Dus, Karton..."
                  className="w-full px-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold mb-2">Satuan Jual (Display)</label>
                <input
                  type="text"
                  required
                  value={formData.satuan_kecil}
                  onChange={e => setFormData({ ...formData, satuan_kecil: e.target.value })}
                  placeholder="Botol, Pcs..."
                  className="w-full px-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold mb-2">Konversi (Isi/{formData.satuan_besar || 'Dus'})</label>
                <input
                  type="number"
                  required min={1}
                  value={formData.qty_per_satuan_besar}
                  onChange={e => setFormData({ ...formData, qty_per_satuan_besar: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block font-semibold mb-2">Harga Beli per {formData.satuan_besar || 'Dus'}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400 font-bold">Rp</span>
                  <input
                    type="number"
                    required min={0}
                    value={formData.harga_beli_satuan_besar}
                    onChange={e => setFormData({ ...formData, harga_beli_satuan_besar: parseInt(e.target.value) || 0 })}
                    className="w-full pl-10 pr-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl font-mono text-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-2">Harga Jual per {formData.satuan_kecil || 'Botol'}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400 font-bold">Rp</span>
                  <input
                    type="number"
                    required min={0}
                    value={formData.harga_jual_satuan_kecil}
                    onChange={e => setFormData({ ...formData, harga_jual_satuan_kecil: parseInt(e.target.value) || 0 })}
                    className="w-full pl-10 pr-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl font-mono text-lg text-indigo-600 dark:text-indigo-400"
                  />
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl mt-2">
              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">
                💡 Analisis Harga: Modal per {formData.satuan_kecil} adalah Rp {
                  Math.round((formData.harga_beli_satuan_besar || 0) / (formData.qty_per_satuan_besar || 1)).toLocaleString('id-ID')
                }. Keuntungan kotor per {formData.satuan_kecil} = Rp {
                  ((formData.harga_jual_satuan_kecil || 0) - Math.round((formData.harga_beli_satuan_besar || 0) / (formData.qty_per_satuan_besar || 1))).toLocaleString('id-ID')
                }.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-surface-100 dark:border-surface-800">
              <button
                type="button"
                onClick={() => router.push('/admin/toko')}
                className="px-6 py-3 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-xl font-bold cursor-pointer transition-colors text-surface-700 dark:text-surface-300"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-bold cursor-pointer shadow-lg hover:brightness-110 transition-all"
              >
                Simpan Master Barang
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <BarangForm />
    </Suspense>
  );
}
