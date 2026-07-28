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

    // Cross-reference RT & status_hunian with local/cloud rumah table if available
    let savedRumah: Rumah[] = [];
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_RUMAH);
        if (raw) savedRumah = JSON.parse(raw);
      } catch (e) {}
    }

    const matrix: IuranMatrixRow[] = data.map((row) => {
      const bulan: Record<number, StatusIuran> = {};
      for (let m = 1; m <= 12; m++) {
        bulan[m] = row[`bulan_${m}`] === 'lunas' ? 'lunas' : 'belum_lunas';
      }
      const matchedRumah = savedRumah.find((r) => cleanHouseNo(r.nomor_rumah) === cleanHouseNo(row.nomor_rumah));
      return {
        rumah_id: row.rumah_id || `r-${cleanHouseNo(row.nomor_rumah)}`,
        nomor_rumah: row.nomor_rumah,
        rt: matchedRumah?.rt || row.rt || '01',
        status_hunian: matchedRumah?.status_hunian || row.status_hunian || 'pemilik',
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
      let { error: pErr } = await client.from('profiles').upsert(profileRecords, { onConflict: 'id' });
      if (pErr && pErr.message?.includes('tanggal_masuk')) {
        // Fallback without tanggal_masuk column if column is missing in Supabase schema
        const legacyRecords = profileRecords.map(({ tanggal_masuk, ...rest }) => rest);
        const retry = await client.from('profiles').upsert(legacyRecords, { onConflict: 'id' });
        pErr = retry.error;
      }
      if (pErr) return { success: false, error: pErr.message };
    }
    return { success: true };
  } catch (e: any) {
    console.error('Supabase Profiles Error:', e);
    return { success: false, error: e?.message || 'Gagal terhubung ke Supabase' };
  }
}

// ── 3. FACTORY RESET ALL CLOUD & LOCAL DATA ─────────────────
export async function clearAllCloudData(): Promise<{ success: boolean; error?: string }> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY_IURAN);
      localStorage.removeItem(STORAGE_KEY_RUMAH);
      localStorage.removeItem(STORAGE_KEY_PROFILES);
      localStorage.removeItem('martinez_events_v1');
      localStorage.removeItem('martinez_kupons_v1');
      localStorage.removeItem('martinez_booths_v1');
    } catch (e) {}
  }

  const client = createClient();
  if (!client) return { success: true };

  try {
    await client.from('kupons').delete().gte('created_at', '1970-01-01');
    await client.from('tenant_booths').delete().gte('created_at', '1970-01-01');
    await client.from('events').delete().gte('created_at', '1970-01-01');
    await client.from('iuran_matrix').delete().gte('updated_at', '1970-01-01');
    await client.from('profiles').delete().gte('created_at', '1970-01-01');
    await client.from('rumah').delete().gte('created_at', '1970-01-01');
    return { success: true };
  } catch (e: any) {
    console.error('Supabase Reset Error:', e);
    return { success: false, error: e?.message || 'Gagal reset data di Cloud Supabase' };
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

    let savedLocalProfiles: Profile[] = [];
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
        if (raw) savedLocalProfiles = JSON.parse(raw);
      } catch (e) {}
    }

    const profilesMap = new Map<string, Profile>();

    // 1. Process profiles table
    (profileData || []).forEach((p) => {
      const targetClean = cleanHouseNo(p.nomor_rumah || '');
      const rMatch = rumahList.find((r) => r.id === p.rumah_id || cleanHouseNo(r.nomor_rumah) === targetClean);
      const localMatch = savedLocalProfiles.find((lp) => lp.id === p.id || cleanHouseNo((lp as any).nomor_rumah || '') === targetClean);

      const resolvedTgl = p.tanggal_masuk || localMatch?.tanggal_masuk || p.created_at?.split('T')[0];

      const prof: Profile = {
        id: p.id || `p-${targetClean}`,
        nama: p.nama || 'Belum ada nama',
        rumah_id: p.rumah_id || (rMatch ? rMatch.id : null),
        role: p.role || 'warga',
        kode_aktivasi: p.kode_aktivasi || 'ACT001',
        phone: p.phone || '-',
        tanggal_masuk: resolvedTgl,
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

// ── 3. EVENTS & KUPONS CLOUD SYNC ───────────────────────────
export async function syncEventsAndKuponsToCloud(
  events: any[],
  kupons: any[],
  booths: any[]
) {
  const client = createClient();
  if (!client) return;

  try {
    if (events && events.length > 0) {
      const evtRecords = events.map((e) => ({
        id: e.id,
        nama_event: e.nama_event,
        nama_kupon: e.nama_kupon,
        tanggal_event: e.tanggal_event,
        lokasi_event: e.lokasi_event,
        is_active: e.is_active,
        rules: e.rules,
        created_at: e.created_at,
      }));
      await client.from('events').upsert(evtRecords, { onConflict: 'id' });
    }

    if (booths && booths.length > 0) {
      const bthRecords = booths.map((b) => ({
        id: b.id,
        event_id: b.event_id,
        nama_booth: b.nama_booth,
        username: b.username,
        password: b.password,
        created_at: b.created_at,
      }));
      await client.from('tenant_booths').upsert(bthRecords, { onConflict: 'id' });
    }

    if (kupons && kupons.length > 0) {
      const kpnRecords = kupons.map((k) => ({
        id: k.id,
        event_id: k.event_id,
        nama_event: k.nama_event,
        nama_kupon: k.nama_kupon,
        warga_id: k.warga_id,
        nomor_rumah: k.nomor_rumah,
        kode_kupon: k.kode_kupon,
        is_used: k.is_used,
        used_at: k.used_at,
        used_by_booth_id: k.used_by_booth_id,
        used_by_booth_nama: k.used_by_booth_nama,
        created_at: k.created_at,
      }));
      await client.from('kupons').upsert(kpnRecords, { onConflict: 'id' });
    }
  } catch (e) {
    console.error('syncEventsAndKuponsToCloud error:', e);
  }
}

export async function fetchKuponsFromCloud(nomorRumahInput?: string): Promise<any[] | null> {
  const client = createClient();
  if (!client) return null;

  try {
    const { data } = await client.from('kupons').select('*');
    if (!data) return null;
    if (nomorRumahInput) {
      const targetClean = cleanHouseNo(nomorRumahInput);
      return data.filter((k) => cleanHouseNo(k.nomor_rumah) === targetClean);
    }
    return data;
  } catch (e) {
    return null;
  }
}

// ── 4. IURAN CONFIG CLOUD SYNC ──────────────────────────────
export async function syncIuranConfigToCloud(config: any) {
  const client = createClient();
  if (!client) return;

  try {
    await client.from('app_config').upsert(
      [
        {
          id: 'iuran_config_v1',
          data: config,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: 'id' }
    );
  } catch (e) {
    console.error('syncIuranConfigToCloud error:', e);
  }
}

export async function fetchIuranConfigFromCloud(): Promise<any | null> {
  const client = createClient();
  if (!client) return null;

  try {
    const { data } = await client.from('app_config').select('*').eq('id', 'iuran_config_v1').single();
    if (data && data.data) {
      return data.data;
    }
  } catch (e) {}
  return null;
}

export async function clearAllEventsAndKuponsCloud() {
  const client = createClient();
  if (!client) return;
  try {
    await client.from('kupons').delete().gte('created_at', '1970-01-01');
    await client.from('tenant_booths').delete().gte('created_at', '1970-01-01');
    await client.from('events').delete().gte('created_at', '1970-01-01');
  } catch (e) {
    console.error('clearAllEventsAndKuponsCloud error:', e);
  }
}
