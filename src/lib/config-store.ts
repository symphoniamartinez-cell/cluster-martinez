// ============================================================
// Iuran Configuration Store Helper
// Super App Cluster Martinez
// Default Nominal: Rp 50.000 / bulan (Rp 600.000 / tahun)
// ============================================================

export interface IuranConfig {
  nominal_per_bulan: number; // default 50.000
  start_date: string; // e.g. '2026-01-01'
  nama_iuran: string; // e.g. 'Iuran Bulanan Kluster Martinez'
  nama_bank: string; // e.g. '(BLU) BCA Digital'
  no_rekening: string; // e.g. '002238893889'
  atas_nama: string; // e.g. 'Devy Octaviana'
  rw_info: string; // e.g. 'RW 037'
  rt_info: string; // e.g. 'Seluruh Ketua RT 01-05 yang bertugas'
  catatan: string;
  updated_at: string;
}

export const DEFAULT_IURAN_CONFIG: IuranConfig = {
  nominal_per_bulan: 50000,
  start_date: '2026-01-01',
  nama_iuran: 'Iuran Bulanan Kluster Martinez',
  nama_bank: '(BLU) BCA Digital',
  no_rekening: '002238893889',
  atas_nama: 'Devy Octaviana',
  rw_info: 'RW 037',
  rt_info: 'Seluruh Ketua RT 01-05 yang bertugas',
  catatan: 'Tarif iuran berlaku untuk seluruh unit rumah pemilik dan penyewa.',
  updated_at: new Date().toISOString(),
};

const STORAGE_KEY_CONFIG = 'martinez_iuran_config_v1';

export function getIuranConfigFromStorage(): IuranConfig {
  if (typeof window === 'undefined') return DEFAULT_IURAN_CONFIG;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (saved) {
      return { ...DEFAULT_IURAN_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_IURAN_CONFIG;
}

export function saveIuranConfigToStorage(config: IuranConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error(e);
  }
}
