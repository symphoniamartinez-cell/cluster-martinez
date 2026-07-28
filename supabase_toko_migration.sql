-- Migration: Tabel Toko Martinez & Kasir
-- Jalankan kode SQL ini di menu SQL Editor pada Dashboard Supabase Anda

-- 1. Tabel Master Barang & Saldo
CREATE TABLE IF NOT EXISTS public.toko_barang (
  id TEXT PRIMARY KEY,
  nama_barang TEXT NOT NULL,
  kategori TEXT DEFAULT 'Umum',
  satuan_besar TEXT NOT NULL,
  satuan_kecil TEXT NOT NULL,
  qty_per_satuan_besar INTEGER NOT NULL DEFAULT 1,
  harga_beli_satuan_besar INTEGER NOT NULL DEFAULT 0,
  harga_jual_satuan_kecil INTEGER NOT NULL DEFAULT 0,
  stok_gudang INTEGER NOT NULL DEFAULT 0,
  stok_display INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabel Pergerakan Stok (Gudang -> Display, atau Beli Masuk)
CREATE TABLE IF NOT EXISTS public.toko_pergerakan_stok (
  id TEXT PRIMARY KEY,
  barang_id TEXT NOT NULL REFERENCES public.toko_barang(id) ON DELETE CASCADE,
  jenis_pergerakan TEXT NOT NULL, -- 'PEMBELIAN_GUDANG' | 'PINDAH_DISPLAY' | 'STOK_KELUAR'
  jumlah_satuan_besar INTEGER NOT NULL DEFAULT 0,
  jumlah_satuan_kecil INTEGER NOT NULL DEFAULT 0,
  harga_beli_satuan_besar INTEGER,
  catatan TEXT,
  dibuat_oleh TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabel Penjualan (Kasir Etalase/Display)
CREATE TABLE IF NOT EXISTS public.toko_penjualan (
  id TEXT PRIMARY KEY,
  barang_id TEXT NOT NULL REFERENCES public.toko_barang(id) ON DELETE CASCADE,
  jumlah_satuan_kecil INTEGER NOT NULL DEFAULT 1,
  total_harga INTEGER NOT NULL DEFAULT 0,
  dijual_oleh TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Aktifkan Row Level Security (opsional, jika Anda menggunakan RLS ketat)
-- ALTER TABLE public.toko_barang ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.toko_pergerakan_stok ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.toko_penjualan ENABLE ROW LEVEL SECURITY;

-- Jika tidak menggunakan auth yang kompleks, kita bypass (allow all) saja:
CREATE POLICY "Allow all actions for toko_barang" ON public.toko_barang FOR ALL USING (true);
CREATE POLICY "Allow all actions for toko_pergerakan_stok" ON public.toko_pergerakan_stok FOR ALL USING (true);
CREATE POLICY "Allow all actions for toko_penjualan" ON public.toko_penjualan FOR ALL USING (true);
