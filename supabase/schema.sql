-- ============================================================
-- Super App Cluster Martinez — Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── 1. Tabel Rumah ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rumah (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_rumah VARCHAR(10) UNIQUE NOT NULL,
  rt VARCHAR(10) DEFAULT '01' NOT NULL,
  status_hunian VARCHAR(20) DEFAULT 'pemilik'
    CHECK (status_hunian IN ('pemilik', 'penyewa', 'dihuni', 'kosong', 'disewakan')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 2. Tabel Profiles (extends auth.users) ──────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama VARCHAR(100) NOT NULL DEFAULT 'Belum ada nama',
  rumah_id UUID REFERENCES rumah(id) ON DELETE SET NULL,
  role VARCHAR(20) DEFAULT 'warga'
    CHECK (role IN ('superadmin', 'pengurus', 'bendahara', 'warga')),
  kode_aktivasi VARCHAR(20),
  phone VARCHAR(20) DEFAULT '-',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 3. Tabel Iuran ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS iuran (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rumah_id UUID REFERENCES rumah(id) ON DELETE CASCADE NOT NULL,
  tahun INT NOT NULL,
  bulan INT NOT NULL CHECK (bulan BETWEEN 1 AND 12),
  status VARCHAR(20) DEFAULT 'belum_lunas'
    CHECK (status IN ('lunas', 'belum_lunas')),
  tanggal_bayar DATE,
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(rumah_id, tahun, bulan)
);

-- ── 4. Tabel Kupon Acara ────────────────────────────────────
CREATE TABLE IF NOT EXISTS kupon_acara (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warga_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tahun INT NOT NULL,
  kode_kupon VARCHAR(50) UNIQUE NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 5. Indexes ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_iuran_rumah_tahun ON iuran(rumah_id, tahun);
CREATE INDEX IF NOT EXISTS idx_iuran_tahun_bulan ON iuran(tahun, bulan);
CREATE INDEX IF NOT EXISTS idx_profiles_rumah ON profiles(rumah_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_kupon_warga_tahun ON kupon_acara(warga_id, tahun);

-- ── 6. Row Level Security (RLS) ─────────────────────────────

ALTER TABLE rumah ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE iuran ENABLE ROW LEVEL SECURITY;
ALTER TABLE kupon_acara ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own, admins can read all
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'pengurus', 'bendahara')
    )
  );

CREATE POLICY "Pengurus/Superadmin can manage profiles"
  ON profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'pengurus')
    )
  );

-- Rumah: all authenticated users can read
CREATE POLICY "Authenticated users can view rumah"
  ON rumah FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Pengurus/Superadmin can manage rumah"
  ON rumah FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'pengurus')
    )
  );

-- Iuran: warga can view own, admins can view all
CREATE POLICY "Warga can view own iuran"
  ON iuran FOR SELECT
  USING (
    rumah_id IN (
      SELECT rumah_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all iuran"
  ON iuran FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'pengurus', 'bendahara')
    )
  );

CREATE POLICY "Bendahara/Superadmin can manage iuran"
  ON iuran FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'bendahara')
    )
  );

-- Kupon: warga can view own, admins can manage
CREATE POLICY "Warga can view own kupon"
  ON kupon_acara FOR SELECT
  USING (warga_id = auth.uid());

CREATE POLICY "Admins can manage kupon"
  ON kupon_acara FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superadmin', 'pengurus', 'bendahara')
    )
  );

-- ── 7. Seed Data — Inisialisasi Data Rumah & Pemilik ─────────
-- Jalankan query di bawah di Supabase SQL Editor untuk membuat 24 unit rumah awal (Status: Pemilik)

INSERT INTO rumah (nomor_rumah, rt, status_hunian) VALUES
  ('MTNU1/1', '01', 'pemilik'), ('MTNU1/2', '01', 'pemilik'), ('MTNU1/3', '01', 'pemilik'), ('MTNU1/4', '01', 'pemilik'), ('MTNU1/5', '01', 'pemilik'), ('MTNU1/6', '01', 'pemilik'),
  ('MTNU2/1', '02', 'pemilik'), ('MTNU2/2', '02', 'pemilik'), ('MTNU2/3', '02', 'pemilik'), ('MTNU2/4', '02', 'pemilik'), ('MTNU2/5', '02', 'pemilik'), ('MTNU2/6', '02', 'pemilik'),
  ('MTNU3/1', '03', 'pemilik'), ('MTNU3/2', '03', 'pemilik'), ('MTNU3/3', '03', 'pemilik'), ('MTNU3/4', '03', 'pemilik'), ('MTNU3/5', '03', 'pemilik'), ('MTNU3/6', '03', 'pemilik'),
  ('MTNU4/1', '04', 'pemilik'), ('MTNU4/2', '04', 'pemilik'), ('MTNU4/3', '04', 'pemilik'), ('MTNU4/4', '04', 'pemilik'), ('MTNU4/5', '04', 'pemilik'), ('MTNU4/6', '04', 'pemilik')
ON CONFLICT (nomor_rumah) DO NOTHING;

