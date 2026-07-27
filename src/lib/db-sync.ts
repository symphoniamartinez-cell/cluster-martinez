// ============================================================
// Supabase Cloud Database Sync Bridge
// Automatic Two-Way Synchronization between Local Cache & Supabase PostgreSQL
// Super App Cluster Martinez
// ============================================================

import { createClient } from '@/lib/supabase/client';
import type { IuranMatrixRow, Profile, Rumah, StatusIuran } from '@/types';
import { BULAN_FULL } from '@/types';

const STORAGE_KEY_IURAN = 'martinez_iuran_matrix_v2';
const STORAGE_KEY_RUMAH = 'martinez_rumah_list_v3';
const STORAGE_KEY_PROFILES = 'martinez_profiles_list_v3';

const cleanHouseNo = (s: string) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// ── 1. IURAN MATRIX CLOUD SYNC ──────────────────────────────
export async function syncIuranMatrixToCloud(matrix: IuranMatrixRow[]): Promise<{ success: boolean; error?: string }> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_IURAN, JSON.stringify(matrix));
    } catch (e) {}
  }

  const client = createClient();
  if (!client) return { success: false, error: 'Supabase client belum terkonfigurasi di Vercel env' };

  try {
    const recordsToUpsert = matrix.map((row) => {
      const rec: Record<string, any> = {
        nomor_rumah: row.nomor_rumah,
        tahun: 2026,
        updated_at: new Date().toISOString(),
      };
      for (let m = 1; m <= 12; m++) {
        const val = row.bulan[m] || (row.bulan as any)[m.toString()] || (row.bulan as any)[BULAN_FULL[m]];
        rec[`bulan_${m}`] = val === 'lunas' ? 'lunas' : 'belum_lunas';
      }
      return rec;
    });

    const { error } = await client
      .from('iuran_matrix')
      .upsert(recordsToUpsert, { onConflict: 'nomor_rumah,tahun' });

    if (error) {
      console.warn('Supabase Iuran Sync Error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e: any) {
    console.error('Supabase Iuran Exception:', e);
    return { success: false, error: e?.message || 'Gagal terhubung ke Supabase' };
  }
}

export async function fetchIuranMatrixFromCloud(): Promise<IuranMatrixRow[] | null> {
  const client = createClient();
  if (!client) return null;

  try {
    const { data, error } = await client.from('iuran_matrix').select('*');
    if (error || !data || data.length === 0) return null;

    const matrix: IuranMatrixRow[] = data.map((row) => {
      const bulan: Record<number, StatusIuran> = {};
      for (let m = 1; m <= 12; m++) {
        bulan[m] = row[`bulan_${m}`] === 'lunas' ? 'lunas' : 'belum_lunas';
      }
      return {
        rumah_id: row.rumah_id || `r-${cleanHouseNo(row.nomor_rumah)}`,
        nomor_rumah: row.nomor_rumah,
        rt: row.rt || '01',
        status_hunian: row.status_hunian || 'pemilik',
        bulan,
      };
    });

    if (typeof window !== 'undefined' && matrix.length > 0) {
      localStorage.setItem(STORAGE_KEY_IURAN, JSON.stringify(matrix));
    }
    return matrix;
  } catch (e) {
    return null;
  }
}

// ── 2. DATA WARGA & PROFILES CLOUD SYNC ─────────────────────
export async function syncProfilesToCloud(profiles: Profile[], rumahList: Rumah[]): Promise<{ success: boolean; error?: string }> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
      localStorage.setItem(STORAGE_KEY_RUMAH, JSON.stringify(rumahList));
    } catch (e) {}
  }

  const client = createClient();
  if (!client) return { success: false, error: 'Supabase client belum terkonfigurasi di Vercel env' };

  try {
    if (rumahList.length > 0) {
      const rumahRecords = rumahList.map((r) => ({
        id: r.id || `r-${cleanHouseNo(r.nomor_rumah)}`,
        nomor_rumah: r.nomor_rumah,
        rt: r.rt || '01',
        status_hunian: r.status_hunian || 'pemilik',
      }));
      const { error: rErr } = await client.from('rumah').upsert(rumahRecords, { onConflict: 'nomor_rumah' });
      if (rErr) console.warn('Supabase Rumah Sync Note:', rErr.message);
    }

    if (profiles.length > 0) {
      const profileRecords = profiles.map((p) => {
        const noRumah = p.rumah?.nomor_rumah || (p as any).nomor_rumah || '';
        return {
          id: p.id || `p-${cleanHouseNo(noRumah)}`,
          nama: p.nama || 'Belum ada nama',
          rumah_id: p.rumah_id,
          nomor_rumah: noRumah,
          role: p.role || 'warga',
          kode_aktivasi: p.kode_aktivasi || 'ACT001',
          phone: p.phone || '-',
          tanggal_masuk: p.tanggal_masuk || new Date().toISOString().split('T')[0],
        };
      });
      const { error: pErr } = await client.from('profiles').upsert(profileRecords, { onConflict: 'id' });
      if (pErr) return { success: false, error: pErr.message };
    }
    return { success: true };
  } catch (e: any) {
    console.error('Supabase Profiles Error:', e);
    return { success: false, error: e?.message || 'Gagal terhubung ke Supabase' };
  }
}

export async function fetchProfilesFromCloud(): Promise<{ profiles: Profile[]; rumahList: Rumah[] } | null> {
  const client = createClient();
  if (!client) return null;

  try {
    const { data: rumahData } = await client.from('rumah').select('*');
    const { data: profileData } = await client.from('profiles').select('*');

    if ((!rumahData || rumahData.length === 0) && (!profileData || profileData.length === 0)) {
      return null;
    }

    const rumahList: Rumah[] = (rumahData || []).map((r) => ({
      id: r.id || `r-${cleanHouseNo(r.nomor_rumah)}`,
      nomor_rumah: r.nomor_rumah,
      rt: r.rt || '01',
      status_hunian: r.status_hunian || 'pemilik',
      created_at: r.created_at || new Date().toISOString(),
    }));

    const profilesMap = new Map<string, Profile>();

    // 1. Process profiles table
    (profileData || []).forEach((p) => {
      const targetClean = cleanHouseNo(p.nomor_rumah || '');
      const rMatch = rumahList.find((r) => r.id === p.rumah_id || cleanHouseNo(r.nomor_rumah) === targetClean);
      const prof: Profile = {
        id: p.id || `p-${targetClean}`,
        nama: p.nama || 'Belum ada nama',
        rumah_id: p.rumah_id || (rMatch ? rMatch.id : null),
        role: p.role || 'warga',
        kode_aktivasi: p.kode_aktivasi || 'ACT001',
        phone: p.phone || '-',
        tanggal_masuk: p.tanggal_masuk || p.created_at?.split('T')[0],
        created_at: p.created_at || new Date().toISOString(),
        rumah: rMatch,
      };
      const key = targetClean || p.id;
      profilesMap.set(key, prof);
    });

    // 2. Fallback: ensure every house in rumahList has a profile record
    rumahList.forEach((r) => {
      const targetClean = cleanHouseNo(r.nomor_rumah);
      if (!profilesMap.has(targetClean)) {
        profilesMap.set(targetClean, {
          id: `p-${targetClean}`,
          nama: 'Belum ada nama',
          rumah_id: r.id,
          role: 'warga',
          kode_aktivasi: 'ACT001',
          phone: '-',
          created_at: new Date().toISOString(),
          rumah: r,
        });
      }
    });

    const profiles = Array.from(profilesMap.values());

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
      localStorage.setItem(STORAGE_KEY_RUMAH, JSON.stringify(rumahList));
    }
    return { profiles, rumahList };
  } catch (e) {
    console.error('fetchProfilesFromCloud error:', e);
    return null;
  }
}
