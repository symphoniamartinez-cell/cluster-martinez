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

import { createClient } from '@/lib/supabase/client';

export async function saveIuranConfigToStorage(config: IuranConfig): Promise<{ cloudOk: boolean; error?: string }> {
  if (typeof window === 'undefined') return { cloudOk: false, error: 'SSR' };

  // Step 1: Always save to localStorage
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('martinez_config_updated', { detail: config }));
    try {
      const bc = new BroadcastChannel('martinez_config_channel');
      bc.postMessage(config);
      bc.close();
    } catch (e) {}
  } catch (e) {
    console.error('localStorage save failed:', e);
  }

  // Step 2: DIRECTLY upsert to Supabase (bypass db-sync layer)
  const client = createClient();
  if (!client) {
    console.warn('[CONFIG] Supabase client NULL — config hanya di localStorage');
    return { cloudOk: false, error: 'Supabase client tidak terhubung' };
  }

  try {
    const payload = {
      id: 'iuran_config_v1',
      data: config,
      updated_at: new Date().toISOString(),
    };
    console.log('[CONFIG] Upserting to app_config:', payload);
    const { error } = await client.from('app_config').upsert([payload], { onConflict: 'id' });
    if (error) {
      console.error('[CONFIG] ❌ Supabase upsert error:', error);
      return { cloudOk: false, error: error.message };
    }
    console.log('[CONFIG] ✅ Config saved to Supabase cloud!');
    return { cloudOk: true };
  } catch (e: any) {
    console.error('[CONFIG] ❌ Exception:', e);
    return { cloudOk: false, error: e?.message || 'Unknown error' };
  }
}
