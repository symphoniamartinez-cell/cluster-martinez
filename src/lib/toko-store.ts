import { TokoBarang, TokoPergerakanStok, TokoPenjualan } from '@/types';
import { createClient } from '@/lib/supabase/client';

const TOKO_BARANG_KEY = 'martinez_toko_barang_v1';
const TOKO_PERGERAKAN_KEY = 'martinez_toko_pergerakan_v1';
const TOKO_PENJUALAN_KEY = 'martinez_toko_penjualan_v1';
const TOKO_PAYMENT_KEY = 'martinez_toko_payment_v1';

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

export function getTokoPaymentHarianLocal(): any[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(TOKO_PAYMENT_KEY);
  return data ? JSON.parse(data) : [];
}

// -------------------------------------------------------------
// CLOUD SYNC & FETCH
// -------------------------------------------------------------
export async function syncTokoDataFromCloud() {
  try {
    const client = createClient();
    if (!client) return { success: false, error: 'No Supabase Client' };

    const [resBarang, resPergerakan, resPenjualan, resPayment] = await Promise.all([
      client.from('toko_barang').select('*').order('nama_barang', { ascending: true }),
      client.from('toko_pergerakan_stok').select('*').order('created_at', { ascending: false }).limit(500),
      client.from('toko_penjualan').select('*').order('created_at', { ascending: false }).limit(500),
      client.from('toko_payment_harian').select('*').order('tanggal', { ascending: false }).limit(100)
    ]);

    if (resBarang.error) throw resBarang.error;

    if (resBarang.data) localStorage.setItem(TOKO_BARANG_KEY, JSON.stringify(resBarang.data));
    if (resPergerakan.data) localStorage.setItem(TOKO_PERGERAKAN_KEY, JSON.stringify(resPergerakan.data));
    if (resPenjualan.data) localStorage.setItem(TOKO_PENJUALAN_KEY, JSON.stringify(resPenjualan.data));
    if (resPayment.data) localStorage.setItem(TOKO_PAYMENT_KEY, JSON.stringify(resPayment.data));

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

export async function saveTokoPaymentHarian(tanggal: string, payment_diterima: number, user: string) {
  try {
    const client = createClient();
    if (client) {
      const payload = {
        tanggal,
        payment_diterima,
        dikonfirmasi_oleh: user,
        dikonfirmasi_pada: new Date().toISOString()
      };
      const { error } = await client.from('toko_payment_harian').upsert(payload, { onConflict: 'tanggal' });
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

export interface PembelianItem {
  barang_id: string;
  tipe_satuan: 'besar' | 'kecil';
  jumlah: number;
  harga_beli_per_unit: number;
}

export async function addPembelianBatchGudang(
  items: PembelianItem[],
  nomorInvoice: string,
  tanggal: string,
  catatan: string,
  user: string
) {
  try {
    const client = createClient();
    const localBarang = getTokoBarangLocal();

    const pergerakanList: TokoPergerakanStok[] = [];
    const barangUpdates: Record<string, { stok_gudang: number; harga_beli_satuan_besar: number }> = {};

    const currentIsoTime = new Date().toISOString().split('T')[1];
    let finalTimestamp = new Date().toISOString();
    if (tanggal && tanggal !== finalTimestamp.split('T')[0]) {
      finalTimestamp = `${tanggal}T${currentIsoTime}`;
    }

    for (const item of items) {
      if (!item.barang_id || item.jumlah <= 0) continue;
      
      const barang = localBarang.find(b => b.id === item.barang_id);
      if (!barang) throw new Error(`Barang ID ${item.barang_id} tidak ditemukan`);

      const isKecil = item.tipe_satuan === 'kecil';
      const qtyPerBesar = barang.qty_per_satuan_besar || 1;

      const jumlahSatuanKecil = isKecil ? item.jumlah : item.jumlah * qtyPerBesar;
      const jumlahSatuanBesar = isKecil ? 0 : item.jumlah;
      const hargaBeliBesarEquivalent = isKecil ? item.harga_beli_per_unit * qtyPerBesar : item.harga_beli_per_unit;

      pergerakanList.push({
        id: 'tps-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        barang_id: item.barang_id,
        jenis_pergerakan: 'PEMBELIAN_GUDANG',
        jumlah_satuan_besar: jumlahSatuanBesar,
        jumlah_satuan_kecil: jumlahSatuanKecil,
        harga_beli_satuan_besar: hargaBeliBesarEquivalent,
        nomor_invoice: nomorInvoice || null,
        catatan,
        dibuat_oleh: user,
        created_at: finalTimestamp
      });

      // Accumulate local updates to avoid duplicate fetching
      const currentStokKecil = barangUpdates[item.barang_id]?.stok_gudang ?? (barang.stok_gudang || 0);
      const currentHargaBeli = barangUpdates[item.barang_id]?.harga_beli_satuan_besar ?? (barang.harga_beli_satuan_besar || 0);
      
      const currentStokBesar = currentStokKecil / (barang.qty_per_satuan_besar || 1);
      const addedStokBesar = jumlahSatuanKecil / (barang.qty_per_satuan_besar || 1);
      
      let newAverageHarga = currentHargaBeli;
      
      if (hargaBeliBesarEquivalent > 0) {
        if (currentStokBesar <= 0) {
          // If no existing stock, average cost is just the new cost
          newAverageHarga = hargaBeliBesarEquivalent;
        } else {
          // Moving average cost
          const totalOldValue = currentStokBesar * currentHargaBeli;
          const totalNewValue = addedStokBesar * hargaBeliBesarEquivalent;
          newAverageHarga = Math.round((totalOldValue + totalNewValue) / (currentStokBesar + addedStokBesar));
        }
      }

      barangUpdates[item.barang_id] = {
        stok_gudang: currentStokKecil + jumlahSatuanKecil,
        harga_beli_satuan_besar: newAverageHarga
      };
    }

    if (pergerakanList.length === 0) throw new Error('Tidak ada barang valid untuk ditambahkan');

    if (client) {
      // 1. Insert pergerakan batch
      const { error: err1 } = await client.from('toko_pergerakan_stok').insert(pergerakanList);
      if (err1) throw err1;

      // 2. Update each barang
      for (const [bId, updateData] of Object.entries(barangUpdates)) {
        const { error: err2 } = await client.from('toko_barang').update(updateData).eq('id', bId);
        if (err2) throw err2;
      }
    }

    await syncTokoDataFromCloud();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export interface KeluarkanItem {
  barang_id: string;
  jumlah_satuan_besar: number;
}

export async function keluarkanBatchGudang(
  items: KeluarkanItem[],
  catatan: string,
  user: string
) {
  try {
    const client = createClient();
    const localBarang = getTokoBarangLocal();

    const pergerakanList: TokoPergerakanStok[] = [];
    const barangUpdates: Record<string, { stok_gudang: number }> = {};

    for (const item of items) {
      if (!item.barang_id || item.jumlah_satuan_besar <= 0) continue;
      
      const barang = localBarang.find(b => b.id === item.barang_id);
      if (!barang) throw new Error(`Barang ID ${item.barang_id} tidak ditemukan`);

      const jumlahSatuanKecil = item.jumlah_satuan_besar * (barang.qty_per_satuan_besar || 1);
      const currentStok = barangUpdates[item.barang_id]?.stok_gudang ?? (barang.stok_gudang || 0);

      if (currentStok < jumlahSatuanKecil) {
        throw new Error(`Stok gudang ${barang.nama_barang} tidak cukup. Sisa: ${currentStok}`);
      }

      pergerakanList.push({
        id: 'tps-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        barang_id: item.barang_id,
        jenis_pergerakan: 'STOK_KELUAR',
        jumlah_satuan_besar: item.jumlah_satuan_besar,
        jumlah_satuan_kecil: jumlahSatuanKecil,
        catatan,
        dibuat_oleh: user,
        created_at: new Date().toISOString()
      });

      barangUpdates[item.barang_id] = {
        stok_gudang: currentStok - jumlahSatuanKecil
      };
    }

    if (pergerakanList.length === 0) throw new Error('Tidak ada barang valid untuk dikeluarkan');

    if (client) {
      const { error: err1 } = await client.from('toko_pergerakan_stok').insert(pergerakanList);
      if (err1) throw err1;

      for (const [bId, updateData] of Object.entries(barangUpdates)) {
        const { error: err2 } = await client.from('toko_barang').update(updateData).eq('id', bId);
        if (err2) throw err2;
      }
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

export async function pindahKeDisplayBatch(items: { barang_id: string; jumlah_satuan_kecil: number }[], user: string) {
  try {
    const client = createClient();
    const localBarang = getTokoBarangLocal();

    const pergerakanList: TokoPergerakanStok[] = [];
    const barangUpdates: Record<string, { stok_gudang: number; stok_display: number }> = {};

    for (const item of items) {
      if (!item.barang_id || item.jumlah_satuan_kecil <= 0) continue;
      
      const barang = localBarang.find(b => b.id === item.barang_id);
      if (!barang) throw new Error(`Barang ID ${item.barang_id} tidak ditemukan`);

      const currentStokGudang = barangUpdates[item.barang_id]?.stok_gudang ?? (barang.stok_gudang || 0);
      const currentStokDisplay = barangUpdates[item.barang_id]?.stok_display ?? (barang.stok_display || 0);

      if (currentStokGudang < item.jumlah_satuan_kecil) {
        throw new Error(`Stok gudang ${barang.nama_barang} tidak cukup. Sisa: ${currentStokGudang}`);
      }

      pergerakanList.push({
        id: 'tps-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        barang_id: item.barang_id,
        jenis_pergerakan: 'PINDAH_DISPLAY',
        jumlah_satuan_besar: 0,
        jumlah_satuan_kecil: item.jumlah_satuan_kecil,
        catatan: 'Pindah ke etalase/kulkas',
        dibuat_oleh: user,
        created_at: new Date().toISOString()
      });

      barangUpdates[item.barang_id] = {
        stok_gudang: currentStokGudang - item.jumlah_satuan_kecil,
        stok_display: currentStokDisplay + item.jumlah_satuan_kecil
      };
    }

    if (pergerakanList.length === 0) throw new Error('Tidak ada barang valid untuk dipindah');

    if (client) {
      const { error: err1 } = await client.from('toko_pergerakan_stok').insert(pergerakanList);
      if (err1) throw err1;

      for (const [bId, updateData] of Object.entries(barangUpdates)) {
        const { error: err2 } = await client.from('toko_barang').update(updateData).eq('id', bId);
        if (err2) throw err2;
      }
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

    const qtyPerBesar = barang.qty_per_satuan_besar || 1;
    const hargaBeliBesar = barang.harga_beli_satuan_besar || 0;
    const hargaModalSatuan = Math.floor(hargaBeliBesar / qtyPerBesar);

    const penjualan: TokoPenjualan = {
      id: 'tpj-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      nomor_invoice: 'INV-JUAL-' + Date.now(),
      barang_id: barangId,
      jumlah_satuan_kecil: jumlahSatuanKecil,
      harga_satuan: hargaSatuan,
      harga_modal_satuan: hargaModalSatuan,
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

  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export interface PenjualanItem {
  barang_id: string;
  jumlah_satuan_kecil: number;
  harga_satuan_custom?: number;
}

export async function inputPenjualanBatch(items: PenjualanItem[], user: string, namaPelanggan?: string) {
  try {
    const barangListLocal = getTokoBarangLocal();
    const penjualanList: TokoPenjualan[] = [];
    const barangUpdates: Record<string, { stok_display: number }> = {};
    const nomorInvoice = 'INV-JUAL-' + Date.now();

    // Validate all items first
    for (const item of items) {
      if (item.jumlah_satuan_kecil <= 0) continue;

      const barang = barangListLocal.find(b => b.id === item.barang_id);
      if (!barang) throw new Error('Barang tidak ditemukan');

      const currentStokDisplay = barangUpdates[item.barang_id]?.stok_display ?? (barang.stok_display || 0);
      if (currentStokDisplay < item.jumlah_satuan_kecil) {
        throw new Error(`Stok display ${barang.nama_barang} tidak cukup. Sisa: ${currentStokDisplay}`);
      }

      const hargaSatuan = barang.harga_jual_satuan_kecil || 0;
      
      // Calculate harga_modal_satuan based on master data
      // For simplicity in this demo, harga modal = harga_beli_satuan_besar / qty_per_satuan_besar
      const qtyPerBesar = barang.qty_per_satuan_besar || 1;
      const hargaBeliBesar = barang.harga_beli_satuan_besar || 0;
      const hargaModalSatuan = Math.floor(hargaBeliBesar / qtyPerBesar);

      const totalHarga = item.jumlah_satuan_kecil * hargaSatuan;

      penjualanList.push({
        id: 'tpj-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        nomor_invoice: nomorInvoice,
        barang_id: item.barang_id,
        jumlah_satuan_kecil: item.jumlah_satuan_kecil,
        harga_satuan: hargaSatuan,
        harga_modal_satuan: hargaModalSatuan,
        total_harga: totalHarga,
        nama_pelanggan: namaPelanggan,
        dijual_oleh: user,
        created_at: new Date().toISOString()
      });

      barangUpdates[item.barang_id] = {
        stok_display: currentStokDisplay - item.jumlah_satuan_kecil
      };
    }

    if (penjualanList.length === 0) throw new Error('Tidak ada barang valid untuk dijual');

    const client = createClient();
    if (client) {
      const { error: err1 } = await client.from('toko_penjualan').insert(penjualanList);
      if (err1) throw err1;

      for (const [bId, updateData] of Object.entries(barangUpdates)) {
        const { error: err2 } = await client.from('toko_barang')
          .update(updateData)
          .eq('id', bId);
        if (err2) throw err2;
      }
    }

    await syncTokoDataFromCloud();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// -------------------------------------------------------------
// EDIT / DELETE PENJUALAN
// -------------------------------------------------------------

export async function deletePenjualanInvoice(nomorInvoice: string) {
  try {
    const allPenjualan = getTokoPenjualanLocal().filter(p => p.nomor_invoice === nomorInvoice);
    if (allPenjualan.length === 0) throw new Error('Invoice tidak ditemukan');

    const barangListLocal = getTokoBarangLocal();
    const barangUpdates: Record<string, { stok_display: number }> = {};

    // Revert stock
    for (const p of allPenjualan) {
      const barang = barangListLocal.find(b => b.id === p.barang_id);
      if (barang) {
        const currentStokDisplay = barangUpdates[p.barang_id]?.stok_display ?? (barang.stok_display || 0);
        barangUpdates[p.barang_id] = {
          stok_display: currentStokDisplay + p.jumlah_satuan_kecil
        };
      }
    }

    const client = createClient();
    if (client) {
      // 1. Delete rows
      const { error: err1 } = await client.from('toko_penjualan').delete().eq('nomor_invoice', nomorInvoice);
      if (err1) throw err1;

      // 2. Update stock
      for (const [bId, updateData] of Object.entries(barangUpdates)) {
        const { error: err2 } = await client.from('toko_barang').update(updateData).eq('id', bId);
        if (err2) throw err2;
      }
    }

    await syncTokoDataFromCloud();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function editPenjualanInvoice(
  nomorInvoice: string, 
  newItems: PenjualanItem[], 
  namaPelanggan: string,
  user: string
) {
  try {
    // Strategy: Delete old invoice, then create new invoice with same invoice number but new data
    
    // 1. Revert Old Stock First (in memory)
    const allPenjualan = getTokoPenjualanLocal().filter(p => p.nomor_invoice === nomorInvoice);
    if (allPenjualan.length === 0) throw new Error('Invoice tidak ditemukan');

    const barangListLocal = getTokoBarangLocal();
    const virtualBarangList = barangListLocal.map(b => ({ ...b })); // Deep copy for virtual stock calc

    for (const p of allPenjualan) {
      const brg = virtualBarangList.find(b => b.id === p.barang_id);
      if (brg) {
        brg.stok_display = (brg.stok_display || 0) + p.jumlah_satuan_kecil;
      }
    }

    // 2. Validate New Stock against Virtual Stock
    const penjualanList: TokoPenjualan[] = [];
    const barangUpdates: Record<string, { stok_display: number }> = {};
    const oldTimestamp = allPenjualan[0]?.created_at || new Date().toISOString();

    for (const item of newItems) {
      if (item.jumlah_satuan_kecil <= 0) continue;

      const barang = virtualBarangList.find(b => b.id === item.barang_id);
      if (!barang) throw new Error('Barang tidak ditemukan');

      const currentStokDisplay = barangUpdates[item.barang_id]?.stok_display ?? (barang.stok_display || 0);
      if (currentStokDisplay < item.jumlah_satuan_kecil) {
        throw new Error(`Stok display ${barang.nama_barang} tidak cukup untuk perubahan ini. Sisa: ${currentStokDisplay}`);
      }

      const hargaSatuan = item.harga_satuan_custom !== undefined ? item.harga_satuan_custom : (barang.harga_jual_satuan_kecil || 0);
      const qtyPerBesar = barang.qty_per_satuan_besar || 1;
      const hargaBeliBesar = barang.harga_beli_satuan_besar || 0;
      const hargaModalSatuan = Math.floor(hargaBeliBesar / qtyPerBesar);
      const totalHarga = item.jumlah_satuan_kecil * hargaSatuan;

      penjualanList.push({
        id: 'tpj-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        nomor_invoice: nomorInvoice,
        barang_id: item.barang_id,
        jumlah_satuan_kecil: item.jumlah_satuan_kecil,
        harga_satuan: hargaSatuan,
        harga_modal_satuan: hargaModalSatuan,
        total_harga: totalHarga,
        nama_pelanggan: namaPelanggan,
        dijual_oleh: user,
        created_at: oldTimestamp // keep original timestamp
      });

      barangUpdates[item.barang_id] = {
        stok_display: currentStokDisplay - item.jumlah_satuan_kecil
      };
    }

    if (penjualanList.length === 0) throw new Error('Tidak ada barang valid untuk dijual');

    // 3. Execute DB Operations
    const client = createClient();
    if (client) {
      // a. Delete old items
      const { error: err1 } = await client.from('toko_penjualan').delete().eq('nomor_invoice', nomorInvoice);
      if (err1) throw err1;

      // b. Insert new items
      const { error: err2 } = await client.from('toko_penjualan').insert(penjualanList);
      if (err2) throw err2;

      // c. Update actual stock based on diff.
      const allInvolvedIds = new Set([
        ...allPenjualan.map(p => p.barang_id),
        ...newItems.map(i => i.barang_id)
      ]);

      for (const bId of Array.from(allInvolvedIds)) {
        const finalStok = barangUpdates[bId]?.stok_display ?? virtualBarangList.find(b=>b.id===bId)?.stok_display ?? 0;
        const { error: err3 } = await client.from('toko_barang').update({ stok_display: finalStok }).eq('id', bId);
        if (err3) throw err3;
      }
    }

    await syncTokoDataFromCloud();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function resetSemuaDataToko() {
  try {
    const client = createClient();
    if (!client) throw new Error('No Supabase Client');

    // 1. Delete all transactions
    // Note: Supabase free tier doesn't allow unqualified deletes without RLS or an explicit condition.
    // Usually .neq('id', 'dummy') works as a workaround to delete all rows.
    const { error: err1 } = await client.from('toko_penjualan').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err1) throw err1;

    const { error: err2 } = await client.from('toko_pergerakan_stok').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err2) throw err2;

    // 2. Reset all stock to 0 for master barang
    const { error: err3 } = await client.from('toko_barang')
      .update({ stok_gudang: 0, stok_display: 0 })
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (err3) throw err3;

    await syncTokoDataFromCloud();
    return { success: true };
  } catch (err: any) {
    console.error('Error resetting toko data:', err);
    return { success: false, error: err.message };
  }
}

// -------------------------------------------------------------
// EDIT / UNDO MUTASI & PEMBELIAN
// -------------------------------------------------------------
export async function deleteMutasiStok(idPergerakan: string) {
  try {
    const client = createClient();
    if (!client) throw new Error('No Supabase Client');

    const pergerakan = getTokoPergerakanLocal().find(p => p.id === idPergerakan);
    if (!pergerakan) throw new Error('Data mutasi tidak ditemukan');

    const barang = getTokoBarangLocal().find(b => b.id === pergerakan.barang_id);
    if (!barang) throw new Error('Barang tidak ditemukan');

    let updateData: { stok_gudang?: number, stok_display?: number } = {};

    if (pergerakan.jenis_pergerakan === 'STOK_KELUAR') {
      updateData.stok_gudang = (barang.stok_gudang || 0) + pergerakan.jumlah_satuan_kecil;
    } else if (pergerakan.jenis_pergerakan === 'PINDAH_DISPLAY') {
      updateData.stok_gudang = (barang.stok_gudang || 0) + pergerakan.jumlah_satuan_kecil;
      updateData.stok_display = (barang.stok_display || 0) - pergerakan.jumlah_satuan_kecil;
    } else {
      throw new Error('Jenis mutasi ini tidak bisa di-undo secara individu');
    }

    const { error: err1 } = await client.from('toko_pergerakan_stok').delete().eq('id', idPergerakan);
    if (err1) throw err1;

    const { error: err2 } = await client.from('toko_barang').update(updateData).eq('id', pergerakan.barang_id);
    if (err2) throw err2;

    await syncTokoDataFromCloud();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateMutasiStok(
  idPergerakan: string,
  newBarangId: string,
  newQtyKecil: number,
  newCatatan: string,
  user: string
) {
  try {
    const client = createClient();
    if (!client) throw new Error('No Supabase Client');

    const oldPergerakan = getTokoPergerakanLocal().find(p => p.id === idPergerakan);
    if (!oldPergerakan) throw new Error('Data mutasi tidak ditemukan');

    if (oldPergerakan.jenis_pergerakan !== 'STOK_KELUAR' && oldPergerakan.jenis_pergerakan !== 'PINDAH_DISPLAY') {
      throw new Error('Jenis mutasi ini tidak bisa diedit secara individu. Silakan edit via Invoice Pembelian.');
    }

    const barangList = getTokoBarangLocal();
    const oldBarang = barangList.find(b => b.id === oldPergerakan.barang_id);
    const newBarang = barangList.find(b => b.id === newBarangId);

    if (!oldBarang) throw new Error('Barang lama tidak ditemukan');
    if (!newBarang) throw new Error('Barang baru tidak ditemukan');

    const barangUpdates: Record<string, { stok_gudang?: number, stok_display?: number }> = {};
    
    // Virtual stock processing
    const vOldGudang = oldBarang.stok_gudang || 0;
    const vOldDisplay = oldBarang.stok_display || 0;
    const vNewGudang = newBarang.stok_gudang || 0;
    const vNewDisplay = newBarang.stok_display || 0;

    // 1. Revert Old Effect
    let oldTargetGudang = vOldGudang;
    let oldTargetDisplay = vOldDisplay;

    if (oldPergerakan.jenis_pergerakan === 'STOK_KELUAR') {
      oldTargetGudang += oldPergerakan.jumlah_satuan_kecil;
    } else if (oldPergerakan.jenis_pergerakan === 'PINDAH_DISPLAY') {
      oldTargetGudang += oldPergerakan.jumlah_satuan_kecil;
      oldTargetDisplay -= oldPergerakan.jumlah_satuan_kecil;
    }

    barangUpdates[oldBarang.id] = { stok_gudang: oldTargetGudang, stok_display: oldTargetDisplay };

    // 2. Apply New Effect
    // if newBarang is same as oldBarang, apply to the already reverted virtual stock
    let newTargetGudang = (oldBarang.id === newBarang.id) ? oldTargetGudang : vNewGudang;
    let newTargetDisplay = (oldBarang.id === newBarang.id) ? oldTargetDisplay : vNewDisplay;

    if (oldPergerakan.jenis_pergerakan === 'STOK_KELUAR') {
      newTargetGudang -= newQtyKecil;
      if (newTargetGudang < 0) throw new Error(`Stok gudang ${newBarang.nama_barang} tidak cukup untuk Stok Keluar. Stok Virtual: ${newTargetGudang + newQtyKecil}`);
    } else if (oldPergerakan.jenis_pergerakan === 'PINDAH_DISPLAY') {
      newTargetGudang -= newQtyKecil;
      newTargetDisplay += newQtyKecil;
      if (newTargetGudang < 0) throw new Error(`Stok gudang ${newBarang.nama_barang} tidak cukup untuk Pindah Display. Stok Virtual: ${newTargetGudang + newQtyKecil}`);
    }

    barangUpdates[newBarang.id] = { stok_gudang: newTargetGudang, stok_display: newTargetDisplay };

    // Execute DB
    const updatePayload: any = {
      barang_id: newBarangId,
      jumlah_satuan_kecil: newQtyKecil,
      catatan: newCatatan,
      dibuat_oleh: user
    };

    const { error: err1 } = await client.from('toko_pergerakan_stok').update(updatePayload).eq('id', idPergerakan);
    if (err1) throw err1;

    for (const [bId, updateData] of Object.entries(barangUpdates)) {
      const { error: err2 } = await client.from('toko_barang').update(updateData).eq('id', bId);
      if (err2) throw err2;
    }

    await syncTokoDataFromCloud();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deletePembelianInvoice(nomorInvoice: string) {
  try {
    const client = createClient();
    if (!client) throw new Error('No Supabase Client');

    const allPergerakan = getTokoPergerakanLocal().filter(p => p.nomor_invoice === nomorInvoice && p.jenis_pergerakan === 'PEMBELIAN_GUDANG');
    if (allPergerakan.length === 0) throw new Error('Invoice pembelian tidak ditemukan');

    const barangList = getTokoBarangLocal();
    const barangUpdates: Record<string, { stok_gudang: number }> = {};

    for (const p of allPergerakan) {
      const b = barangList.find(x => x.id === p.barang_id);
      if (b) {
        const currentStok = barangUpdates[p.barang_id]?.stok_gudang ?? b.stok_gudang ?? 0;
        barangUpdates[p.barang_id] = { stok_gudang: currentStok - p.jumlah_satuan_kecil };
      }
    }

    const { error: err1 } = await client.from('toko_pergerakan_stok').delete().eq('nomor_invoice', nomorInvoice).eq('jenis_pergerakan', 'PEMBELIAN_GUDANG');
    if (err1) throw err1;

    for (const [bId, updateData] of Object.entries(barangUpdates)) {
      const { error: err2 } = await client.from('toko_barang').update(updateData).eq('id', bId);
      if (err2) throw err2;
    }

    await syncTokoDataFromCloud();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function editPembelianInvoice(
  nomorInvoice: string,
  newItems: PembelianItem[],
  catatan: string,
  user: string
) {
  try {
    const client = createClient();
    if (!client) throw new Error('No Supabase Client');

    const oldPergerakan = getTokoPergerakanLocal().filter(p => p.nomor_invoice === nomorInvoice && p.jenis_pergerakan === 'PEMBELIAN_GUDANG');
    if (oldPergerakan.length === 0) throw new Error('Invoice pembelian lama tidak ditemukan');

    const oldDate = oldPergerakan[0].created_at;

    const barangList = getTokoBarangLocal();
    
    // Simulate reversing old items
    const virtualBarangList = barangList.map(b => ({ ...b }));
    for (const p of oldPergerakan) {
      const vb = virtualBarangList.find(x => x.id === p.barang_id);
      if (vb) {
        vb.stok_gudang = (vb.stok_gudang || 0) - p.jumlah_satuan_kecil;
      }
    }

    // Process new items
    const newPergerakan: TokoPergerakanStok[] = [];
    const barangUpdates: Record<string, { stok_gudang: number; harga_beli_satuan_besar?: number }> = {};

    for (const item of newItems) {
      if (!item.barang_id || item.jumlah <= 0) continue;
      const b = virtualBarangList.find(x => x.id === item.barang_id);
      if (!b) throw new Error(`Barang ID ${item.barang_id} tidak ditemukan`);

      const isKecil = item.tipe_satuan === 'kecil';
      const qtyPerBesar = b.qty_per_satuan_besar || 1;
      
      const qtySatuanKecil = isKecil ? item.jumlah : item.jumlah * qtyPerBesar;
      const qtySatuanBesar = isKecil ? 0 : item.jumlah;
      const hargaBeliBesarEquivalent = isKecil ? item.harga_beli_per_unit * qtyPerBesar : item.harga_beli_per_unit;

      const currentStokGudang = barangUpdates[item.barang_id]?.stok_gudang ?? b.stok_gudang ?? 0;
      const currentHargaBeli = barangUpdates[item.barang_id]?.harga_beli_satuan_besar ?? b.harga_beli_satuan_besar ?? 0;

      const currentStokBesar = currentStokGudang / qtyPerBesar;
      const addedStokBesar = qtySatuanKecil / qtyPerBesar;

      let newAverageHarga = currentHargaBeli;
      if (hargaBeliBesarEquivalent > 0) {
        if (currentStokBesar <= 0) {
          newAverageHarga = hargaBeliBesarEquivalent;
        } else {
          const totalOldValue = currentStokBesar * currentHargaBeli;
          const totalNewValue = addedStokBesar * hargaBeliBesarEquivalent;
          newAverageHarga = Math.round((totalOldValue + totalNewValue) / (currentStokBesar + addedStokBesar));
        }
      }
      
      newPergerakan.push({
        id: 'tps-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        barang_id: item.barang_id,
        jenis_pergerakan: 'PEMBELIAN_GUDANG',
        jumlah_satuan_besar: qtySatuanBesar,
        jumlah_satuan_kecil: qtySatuanKecil,
        harga_beli_satuan_besar: hargaBeliBesarEquivalent,
        catatan,
        nomor_invoice: nomorInvoice,
        dibuat_oleh: user,
        created_at: oldDate // keep original date
      });

      barangUpdates[item.barang_id] = { 
        stok_gudang: currentStokGudang + qtySatuanKecil,
        harga_beli_satuan_besar: newAverageHarga
      };
    }

    if (newPergerakan.length === 0) throw new Error('Tidak ada barang valid untuk diubah');

    // Exec DB
    const { error: err1 } = await client.from('toko_pergerakan_stok').delete().eq('nomor_invoice', nomorInvoice).eq('jenis_pergerakan', 'PEMBELIAN_GUDANG');
    if (err1) throw err1;

    const { error: err2 } = await client.from('toko_pergerakan_stok').insert(newPergerakan);
    if (err2) throw err2;

    const allInvolvedIds = new Set([
      ...oldPergerakan.map(p => p.barang_id),
      ...newItems.map(i => i.barang_id)
    ]);

    for (const bId of Array.from(allInvolvedIds)) {
      const finalStok = barangUpdates[bId]?.stok_gudang ?? virtualBarangList.find(b=>b.id===bId)?.stok_gudang ?? 0;
      const updatePayload: any = { stok_gudang: finalStok };
      if (barangUpdates[bId]?.harga_beli_satuan_besar !== undefined) {
        updatePayload.harga_beli_satuan_besar = barangUpdates[bId].harga_beli_satuan_besar;
      }
      const { error: err3 } = await client.from('toko_barang').update(updatePayload).eq('id', bId);
      if (err3) throw err3;
    }

    await syncTokoDataFromCloud();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function getClientUserName(fallback: string = 'Unknown'): string {
  if (typeof window === 'undefined') return fallback;
  try {
    const sessionData = JSON.parse(sessionStorage.getItem('demo_user') || '{}');
    if (sessionData.label) return sessionData.label;
  } catch {}
  try {
    const cookies = document.cookie.split(';');
    const demoUserCookie = cookies.find(c => c.trim().startsWith('demo_user='));
    if (demoUserCookie) {
      const cookieValue = demoUserCookie.split('=')[1];
      const sessionData = JSON.parse(decodeURIComponent(cookieValue));
      if (sessionData.label) return sessionData.label;
    }
  } catch {}
  try {
    const role = localStorage.getItem('martinez_role');
    if (role) return role;
  } catch {}
  return fallback;
}
