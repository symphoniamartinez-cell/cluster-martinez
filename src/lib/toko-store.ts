import { TokoBarang, TokoPergerakanStok, TokoPenjualan } from '@/types';
import { createClient } from '@/lib/supabase/client';

const TOKO_BARANG_KEY = 'martinez_toko_barang_v1';
const TOKO_PERGERAKAN_KEY = 'martinez_toko_pergerakan_v1';
const TOKO_PENJUALAN_KEY = 'martinez_toko_penjualan_v1';

// -------------------------------------------------------------
// LOCAL STORAGE GETTERS
// -------------------------------------------------------------
export function getTokoBarangLocal(): TokoBarang[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(TOKO_BARANG_KEY);
  return data ? JSON.parse(data) : [];
}

export function getTokoPergerakanLocal(): TokoPergerakanStok[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(TOKO_PERGERAKAN_KEY);
  return data ? JSON.parse(data) : [];
}

export function getTokoPenjualanLocal(): TokoPenjualan[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(TOKO_PENJUALAN_KEY);
  return data ? JSON.parse(data) : [];
}

// -------------------------------------------------------------
// CLOUD SYNC & FETCH
// -------------------------------------------------------------
export async function syncTokoDataFromCloud() {
  try {
    const client = createClient();
    if (!client) return { success: false, error: 'No Supabase Client' };

    const [resBarang, resPergerakan, resPenjualan] = await Promise.all([
      client.from('toko_barang').select('*').order('nama_barang', { ascending: true }),
      client.from('toko_pergerakan_stok').select('*').order('created_at', { ascending: false }).limit(500),
      client.from('toko_penjualan').select('*').order('created_at', { ascending: false }).limit(500)
    ]);

    if (resBarang.error) throw resBarang.error;

    if (resBarang.data) localStorage.setItem(TOKO_BARANG_KEY, JSON.stringify(resBarang.data));
    if (resPergerakan.data) localStorage.setItem(TOKO_PERGERAKAN_KEY, JSON.stringify(resPergerakan.data));
    if (resPenjualan.data) localStorage.setItem(TOKO_PENJUALAN_KEY, JSON.stringify(resPenjualan.data));

    return { success: true };
  } catch (err: any) {
    console.error('Error syncing toko data:', err);
    return { success: false, error: err.message };
  }
}

// -------------------------------------------------------------
// ADMIN ACTIONS
// -------------------------------------------------------------
export async function saveTokoBarang(barang: TokoBarang) {
  try {
    const client = createClient();
    if (client) {
      const { error } = await client.from('toko_barang').upsert(barang, { onConflict: 'id' });
      if (error) throw error;
    }
    await syncTokoDataFromCloud();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteTokoBarang(id: string) {
  try {
    const client = createClient();
    if (client) {
      const { error } = await client.from('toko_barang').delete().eq('id', id);
      if (error) throw error;
    }
    await syncTokoDataFromCloud();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function addPembelianGudang(barangId: string, jumlahSatuanBesar: number, catatan: string, user: string, hargaBeliSatuanBesar: number = 0) {
  try {
    const barang = getTokoBarangLocal().find(b => b.id === barangId);
    if (!barang) throw new Error('Barang tidak ditemukan');

    const jumlahSatuanKecil = jumlahSatuanBesar * (barang.qty_per_satuan_besar || 1);

    const pergerakan: TokoPergerakanStok = {
      id: 'tps-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      barang_id: barangId,
      jenis_pergerakan: 'PEMBELIAN_GUDANG',
      jumlah_satuan_besar: jumlahSatuanBesar,
      jumlah_satuan_kecil: jumlahSatuanKecil,
      harga_beli_satuan_besar: hargaBeliSatuanBesar,
      catatan,
      dibuat_oleh: user,
      created_at: new Date().toISOString()
    };

    const client = createClient();
    if (client) {
      const { error: err1 } = await client.from('toko_pergerakan_stok').insert(pergerakan);
      if (err1) throw err1;

      const newStokGudang = (barang.stok_gudang || 0) + jumlahSatuanKecil;
      const { error: err2 } = await client.from('toko_barang').update({ 
        stok_gudang: newStokGudang,
        harga_beli_satuan_besar: hargaBeliSatuanBesar > 0 ? hargaBeliSatuanBesar : barang.harga_beli_satuan_besar
      }).eq('id', barangId);
      if (err2) throw err2;
    }

    await syncTokoDataFromCloud();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function keluarkanGudang(barangId: string, jumlahSatuanBesar: number, catatan: string, user: string) {
  try {
    const barang = getTokoBarangLocal().find(b => b.id === barangId);
    if (!barang) throw new Error('Barang tidak ditemukan');

    const jumlahSatuanKecil = jumlahSatuanBesar * (barang.qty_per_satuan_besar || 1);

    if ((barang.stok_gudang || 0) < jumlahSatuanKecil) {
      throw new Error(`Stok gudang tidak cukup. Sisa: ${barang.stok_gudang}`);
    }

    const pergerakan: TokoPergerakanStok = {
      id: 'tps-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      barang_id: barangId,
      jenis_pergerakan: 'STOK_KELUAR',
      jumlah_satuan_besar: jumlahSatuanBesar,
      jumlah_satuan_kecil: jumlahSatuanKecil,
      catatan,
      dibuat_oleh: user,
      created_at: new Date().toISOString()
    };

    const client = createClient();
    if (client) {
      const { error: err1 } = await client.from('toko_pergerakan_stok').insert(pergerakan);
      if (err1) throw err1;

      const newStokGudang = (barang.stok_gudang || 0) - jumlahSatuanKecil;
      const { error: err2 } = await client.from('toko_barang').update({ stok_gudang: newStokGudang }).eq('id', barangId);
      if (err2) throw err2;
    }

    await syncTokoDataFromCloud();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// -------------------------------------------------------------
// GUARD / CASHIER ACTIONS
// -------------------------------------------------------------
export async function pindahKeDisplay(barangId: string, jumlahSatuanKecil: number, user: string) {
  try {
    const barang = getTokoBarangLocal().find(b => b.id === barangId);
    if (!barang) throw new Error('Barang tidak ditemukan');

    if ((barang.stok_gudang || 0) < jumlahSatuanKecil) {
      throw new Error(`Stok gudang tidak cukup. Sisa: ${barang.stok_gudang}`);
    }

    const pergerakan: TokoPergerakanStok = {
      id: 'tps-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      barang_id: barangId,
      jenis_pergerakan: 'PINDAH_DISPLAY',
      jumlah_satuan_besar: 0,
      jumlah_satuan_kecil: jumlahSatuanKecil,
      catatan: 'Pindah ke etalase/kulkas',
      dibuat_oleh: user,
      created_at: new Date().toISOString()
    };

    const client = createClient();
    if (client) {
      const { error: err1 } = await client.from('toko_pergerakan_stok').insert(pergerakan);
      if (err1) throw err1;

      const newStokGudang = (barang.stok_gudang || 0) - jumlahSatuanKecil;
      const newStokDisplay = (barang.stok_display || 0) + jumlahSatuanKecil;
      
      const { error: err2 } = await client.from('toko_barang')
        .update({ stok_gudang: newStokGudang, stok_display: newStokDisplay })
        .eq('id', barangId);
      if (err2) throw err2;
    }

    await syncTokoDataFromCloud();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function inputPenjualan(barangId: string, jumlahSatuanKecil: number, user: string) {
  try {
    const barang = getTokoBarangLocal().find(b => b.id === barangId);
    if (!barang) throw new Error('Barang tidak ditemukan');

    if ((barang.stok_display || 0) < jumlahSatuanKecil) {
      throw new Error(`Stok display tidak cukup. Sisa: ${barang.stok_display}`);
    }

    const hargaSatuan = barang.harga_jual_satuan_kecil || 0;
    const totalHarga = jumlahSatuanKecil * hargaSatuan;

    const penjualan: TokoPenjualan = {
      id: 'tpj-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      barang_id: barangId,
      jumlah_satuan_kecil: jumlahSatuanKecil,
      harga_satuan: hargaSatuan,
      total_harga: totalHarga,
      dijual_oleh: user,
      created_at: new Date().toISOString()
    };

    const client = createClient();
    if (client) {
      const { error: err1 } = await client.from('toko_penjualan').insert(penjualan);
      if (err1) throw err1;

      const newStokDisplay = (barang.stok_display || 0) - jumlahSatuanKecil;
      
      const { error: err2 } = await client.from('toko_barang')
        .update({ stok_display: newStokDisplay })
        .eq('id', barangId);
      if (err2) throw err2;
    }

    await syncTokoDataFromCloud();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
