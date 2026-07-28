// ============================================================
// Super App Cluster Martinez — Type Definitions
// ============================================================

export type UserRole = 'superadmin' | 'pengurus' | 'bendahara' | 'warga' | 'booth' | 'penjaga_ch';

export type StatusHunian = 'pemilik' | 'penyewa' | 'kosong' | 'dihuni' | 'disewakan';

export type StatusIuran = 'lunas' | 'belum_lunas';

export interface TenantBooth {
  id: string;
  event_id: string;
  nama_booth: string; // e.g. 'Booth Bakso Pak No'
  username: string;   // e.g. 'booth-bakso'
  password: string;   // e.g. 'Martinez.2021'
  total_scanned: number;
  created_at: string;
}

// -----------------------------------------------------------
// Database Models
// -----------------------------------------------------------

export interface Rumah {
  id: string;
  nomor_rumah: string;
  rt: string;
  status_hunian: StatusHunian;
  created_at: string;
}

export interface Profile {
  id: string;
  nama: string;
  rumah_id: string | null;
  role: UserRole;
  kode_aktivasi: string | null;
  phone: string | null;
  tanggal_masuk?: string; // YYYY-MM-DD (Registration date)
  created_at: string;
  // Joined
  rumah?: Rumah;
}

export interface Iuran {
  id: string;
  rumah_id: string;
  tahun: number;
  bulan: number;
  status: StatusIuran;
  tanggal_bayar: string | null;
  verified_by: string | null;
  created_at: string;
  // Joined
  rumah?: Rumah;
}

export interface KuponCategory {
  id: string;
  nama_kategori: string; // e.g. "Makanan Berat", "Makanan Ringan", "Minuman", "Souvenir/Doorprize"
}

export interface DynamicCouponRuleTier {
  id: string;
  nama_tier: string;        // e.g. "Tier Full Bayar", "Tier Lunas 5 - 7 Bulan"
  min_lunas_bulan: number;  // e.g. 8, 5, 1, 0
  kupon_per_category: Record<string, number>; // { 'cat-1': 1, 'cat-2': 2 }
}

export interface CouponRules {
  categories?: KuponCategory[];
  tiers?: DynamicCouponRuleTier[];

  // Fallback backward compatibility
  tier1_min_bulan?: number;
  tier1_max_bulan?: number;
  tier1_kupon?: number;

  tier2_min_bulan?: number;
  tier2_max_bulan?: number;
  tier2_kupon?: number;

  tier3_min_bulan?: number;
  tier3_max_bulan?: number;
  tier3_kupon?: number;

  tidak_bayar_0?: number;

  full_lunas_12?: number;
  rajin_8_11?: number;
  bolong_1_7?: number;
}

export interface EventAcara {
  id: string;
  nama_event: string; // e.g. 'Acara HUT RI Kluster Martinez'
  nama_kupon: string; // e.g. 'Kupon Acara Utama'
  tanggal_event: string; // e.g. '2026-08-17'
  lokasi_event: string; // e.g. 'Lapangan Kluster'
  rules: CouponRules;
  is_active: boolean;
  created_at: string;
}

export interface KuponAcara {
  id: string;
  event_id: string;
  nama_event: string;
  nama_kupon: string; // e.g. "Kupon Makanan Berat"
  kategori_id?: string;
  kategori_nama?: string;
  warga_id: string;
  nomor_rumah: string;
  tahun: number;
  kode_kupon: string;
  is_used: boolean;
  used_at: string | null;
  used_by_admin?: string | null;
  used_by_booth_id?: string | null;
  used_by_booth_nama?: string | null;
  created_at: string;
}

export interface UserAccount {
  id: string;
  username: string; // e.g. 'ADMIN', 'PENGURUS', 'BENDAHARA', or house number 'MTNU3/2'
  nama: string;
  role: UserRole;
  password: string; // default 'Martinez.2021'
  rumah_id?: string | null;
  nomor_rumah?: string | null;
  created_at: string;
}

// -----------------------------------------------------------
// TOKO MARTINEZ MODELS
// -----------------------------------------------------------

export interface TokoBarang {
  id: string;
  nama_barang: string;
  kategori: string;
  satuan_besar: string; // e.g. 'Dus'
  satuan_kecil: string; // e.g. 'Botol'
  qty_per_satuan_besar: number;
  harga_beli_satuan_besar: number;
  harga_jual_satuan_kecil: number;
  stok_gudang: number; // in satuan_kecil
  stok_display: number; // in satuan_kecil
  created_at?: string;
  updated_at?: string;
}

export interface TokoPergerakanStok {
  id: string;
  barang_id: string;
  jenis_pergerakan: 'PEMBELIAN_GUDANG' | 'PINDAH_DISPLAY' | 'STOK_KELUAR';
  jumlah_satuan_besar: number;
  jumlah_satuan_kecil: number;
  catatan?: string | null;
  dibuat_oleh?: string;
  created_at?: string;
}

export interface TokoPenjualan {
  id: string;
  barang_id: string;
  jumlah_satuan_kecil: number;
  harga_satuan: number;
  total_harga: number;
  dijual_oleh?: string;
  created_at?: string;
}

// -----------------------------------------------------------
// UI / Component Props Helpers
// -----------------------------------------------------------

export interface IuranMatrixRow {
  rumah_id: string;
  nomor_rumah: string;
  rt?: string;
  status_hunian: StatusHunian;
  bulan: Record<number, StatusIuran>; // 1-12
}

export interface UserSession {
  id: string;
  nama: string;
  role: UserRole;
  rumah_id: string | null;
  nomor_rumah: string | null;
}

// -----------------------------------------------------------
// Constants
// -----------------------------------------------------------

export const BULAN_LABELS: Record<number, string> = {
  1: 'Jan',
  2: 'Feb',
  3: 'Mar',
  4: 'Apr',
  5: 'Mei',
  6: 'Jun',
  7: 'Jul',
  8: 'Agt',
  9: 'Sep',
  10: 'Okt',
  11: 'Nov',
  12: 'Des',
};

export const BULAN_FULL: Record<number, string> = {
  1: 'Januari',
  2: 'Februari',
  3: 'Maret',
  4: 'April',
  5: 'Mei',
  6: 'Juni',
  7: 'Juli',
  8: 'Agustus',
  9: 'September',
  10: 'Oktober',
  11: 'November',
  12: 'Desember',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super Admin',
  pengurus: 'Pengurus',
  bendahara: 'Bendahara',
  warga: 'Warga',
  booth: 'Tenant / Booth Makanan',
  penjaga_ch: 'Penjaga Clubhouse',
};
