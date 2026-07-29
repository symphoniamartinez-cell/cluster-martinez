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
  nomor_invoice TEXT,
  catatan TEXT,
  dibuat_oleh TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabel Penjualan (Kasir Etalase/Display)
CREATE TABLE IF NOT EXISTS public.toko_penjualan (
  id TEXT PRIMARY KEY,
  nomor_invoice TEXT NOT NULL,
  barang_id TEXT NOT NULL REFERENCES public.toko_barang(id) ON DELETE CASCADE,
  jumlah_satuan_kecil INTEGER NOT NULL DEFAULT 1,
  harga_satuan INTEGER NOT NULL DEFAULT 0,
  harga_modal_satuan INTEGER NOT NULL DEFAULT 0,
  total_harga INTEGER NOT NULL DEFAULT 0,
  nama_pelanggan TEXT,
  dijual_oleh TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Mengupdate tabel toko_penjualan jika tabel sudah terlanjur ada sebelumnya
-- tanpa kolom nomor_invoice, harga_modal_satuan, dan nama_pelanggan
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='toko_penjualan' AND column_name='nomor_invoice') THEN
    ALTER TABLE public.toko_penjualan ADD COLUMN nomor_invoice TEXT NOT NULL DEFAULT 'INV-LAMA';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='toko_penjualan' AND column_name='harga_satuan') THEN
    ALTER TABLE public.toko_penjualan ADD COLUMN harga_satuan INTEGER NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='toko_penjualan' AND column_name='harga_modal_satuan') THEN
    ALTER TABLE public.toko_penjualan ADD COLUMN harga_modal_satuan INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='toko_penjualan' AND column_name='nama_pelanggan') THEN
    ALTER TABLE public.toko_penjualan ADD COLUMN nama_pelanggan TEXT;
  END IF;
END $$;

-- Aktifkan Row Level Security (opsional, jika Anda menggunakan RLS ketat)
-- ALTER TABLE public.toko_barang ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.toko_pergerakan_stok ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.toko_penjualan ENABLE ROW LEVEL SECURITY;

-- Jika tidak menggunakan auth yang kompleks, kita bypass (allow all) saja:
DROP POLICY IF EXISTS "Allow all actions for toko_barang" ON public.toko_barang;
CREATE POLICY "Allow all actions for toko_barang" ON public.toko_barang FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all actions for toko_pergerakan_stok" ON public.toko_pergerakan_stok;
CREATE POLICY "Allow all actions for toko_pergerakan_stok" ON public.toko_pergerakan_stok FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all actions for toko_penjualan" ON public.toko_penjualan;
CREATE POLICY "Allow all actions for toko_penjualan" ON public.toko_penjualan FOR ALL USING (true);

-- === PENTING: RELOAD SCHEMA CACHE ===
-- Jika Anda baru saja menambahkan kolom baru (seperti harga_modal_satuan),
-- Supabase seringkali belum menyadarinya dan menyebabkan error (schema cache).
-- Jalankan perintah di bawah ini untuk me-refresh cache Supabase:
NOTIFY pgrst, 'reload schema';
