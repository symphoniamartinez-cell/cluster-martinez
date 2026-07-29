// ============================================================
// Supabase Cloud Database Sync Bridge
// Automatic Two-Way Synchronization between Local Cache & Supabase PostgreSQL
// Super App Cluster Martinez
// ============================================================

import { createClient } from '@/lib/supabase/client';
import type { IuranMatrixRow, Profile, Rumah, StatusIuran } from '@/types';
import { BULAN_FULL } from '@/types';

const STORAGE_KEY_RUMAH = 'martinez_rumah_list_v3';
const STORAGE_KEY_PROFILES = 'martinez_profiles_list_v3';

const cleanHouseNo = (s: string) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// ── Debug Logger ────────────────────────────────────────────
function dbLog(tag: string, msg: string, data?: any) {
  const ts = new Date().toLocaleTimeString('id-ID');
  console.log(`[DB-SYNC ${ts}] [${tag}] ${msg}`, data !== undefined ? data : '');
}

// ── 1. IURAN MATRIX CLOUD SYNC ──────────────────────────────
export async function syncIuranMatrixToCloud(matrix: IuranMatrixRow[], tahun: number): Promise<{ success: boolean; error?: string }> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`martinez_iuran_matrix_${tahun}`, JSON.stringify(matrix));
    } catch (e) {}
  }

  const client = createClient();
  if (!client) {
    dbLog('IURAN_SYNC', '⚠️ Supabase client NULL — data hanya tersimpan di localStorage');
    return { success: false, error: 'Supabase client belum terkonfigurasi di Vercel env' };
  }

  try {
    const recordsToUpsert = matrix.map((row) => {
      const rec: Record<string, any> = {
        nomor_rumah: row.nomor_rumah,
        tahun: tahun,
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
      dbLog('IURAN_SYNC', '❌ Supabase Error:', error.message);
      return { success: false, error: error.message };
    }
    dbLog('IURAN_SYNC', '✅ Berhasil sync iuran matrix ke cloud', { rows: matrix.length });
    return { success: true };
  } catch (e: any) {
    dbLog('IURAN_SYNC', '❌ Exception:', e?.message);
    return { success: false, error: e?.message || 'Gagal terhubung ke Supabase' };
  }
}

export async function fetchIuranMatrixFromCloud(tahun: number): Promise<IuranMatrixRow[] | null> {
  const client = createClient();
  if (!client) {
    dbLog('IURAN_FETCH', '⚠️ Supabase client NULL — skip cloud fetch');
    return null;
  }

  try {
    const { data, error } = await client.from('iuran_matrix').select('*').eq('tahun', tahun);
    if (error) {
      dbLog('IURAN_FETCH', '❌ Query error:', error.message);
      return null;
    }
    if (!data || data.length === 0) {
      dbLog('IURAN_FETCH', '⚠️ Tabel iuran_matrix kosong di cloud');
      return null;
    }

    let savedRumah: Rumah[] = [];
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_RUMAH);
        if (raw) savedRumah = JSON.parse(raw);
      } catch (e) {}
    }

    if (savedRumah.length === 0) {
      const { data: rData } = await client.from('rumah').select('*');
      if (rData) {
        savedRumah = rData.map((r: any) => ({
          id: r.id,
          nomor_rumah: r.nomor_rumah,
          rt: r.rt || '01',
          status_hunian: r.status_hunian || 'pemilik',
          created_at: r.created_at
        }));
      }
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
      localStorage.setItem(`martinez_iuran_matrix_${tahun}`, JSON.stringify(matrix));
    }
    dbLog('IURAN_FETCH', `✅ Berhasil fetch iuran matrix tahun ${tahun} dari cloud`, { rows: matrix.length });
    return matrix;
  } catch (e: any) {
    dbLog('IURAN_FETCH', '❌ Exception:', e?.message);
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
  if (!client) {
    dbLog('PROFILES_SYNC', '⚠️ Supabase client NULL — data hanya di localStorage');
    return { success: false, error: 'Supabase client belum terkonfigurasi di Vercel env' };
  }

  try {
    if (rumahList.length > 0) {
      const rumahRecords = rumahList.map((r) => ({
        id: r.id || `r-${cleanHouseNo(r.nomor_rumah)}`,
        nomor_rumah: r.nomor_rumah,
        rt: r.rt || '01',
        status_hunian: r.status_hunian || 'pemilik',
      }));
      const { error: rErr } = await client.from('rumah').upsert(rumahRecords, { onConflict: 'nomor_rumah' });
      if (rErr) dbLog('PROFILES_SYNC', '⚠️ Rumah sync note:', rErr.message);
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
      if (pErr) {
        dbLog('PROFILES_SYNC', '❌ Profile sync error:', pErr.message);
        return { success: false, error: pErr.message };
      }
    }
    dbLog('PROFILES_SYNC', '✅ Berhasil sync profiles ke cloud');
    return { success: true };
  } catch (e: any) {
    dbLog('PROFILES_SYNC', '❌ Exception:', e?.message);
    return { success: false, error: e?.message || 'Gagal terhubung ke Supabase' };
  }
}

// ── FACTORY RESET ALL CLOUD & LOCAL DATA ─────────────────
export async function clearAllCloudData(): Promise<{ success: boolean; error?: string }> {
  if (typeof window !== 'undefined') {
    try {
      for(let y=2024;y<=2030;y++){localStorage.removeItem(`martinez_iuran_matrix_${y}`);}
      localStorage.removeItem(STORAGE_KEY_RUMAH);
      localStorage.removeItem(STORAGE_KEY_PROFILES);
      localStorage.removeItem('martinez_events_v1');
      localStorage.removeItem('martinez_kupons_v1');
      localStorage.removeItem('martinez_booths_v1');
      localStorage.removeItem('martinez_iuran_config_v1');
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
    await client.from('app_config').delete().eq('id', 'iuran_config_v1');
    return { success: true };
  } catch (e: any) {
    dbLog('RESET', '❌ Exception:', e?.message);
    return { success: false, error: e?.message || 'Gagal reset data di Cloud Supabase' };
  }
}

export async function fetchProfilesFromCloud(): Promise<{ profiles: Profile[]; rumahList: Rumah[] } | null> {
  const client = createClient();
  if (!client) {
    dbLog('PROFILES_FETCH', '⚠️ Supabase client NULL — skip cloud fetch');
    return null;
  }

  try {
    const { data: rumahData, error: rErr } = await client.from('rumah').select('*');
    const { data: profileData, error: pErr } = await client.from('profiles').select('*');

    if (rErr) dbLog('PROFILES_FETCH', '⚠️ Rumah query error:', rErr.message);
    if (pErr) dbLog('PROFILES_FETCH', '⚠️ Profiles query error:', pErr.message);

    if ((!rumahData || rumahData.length === 0) && (!profileData || profileData.length === 0)) {
      dbLog('PROFILES_FETCH', '⚠️ Cloud profiles & rumah kosong');
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
    dbLog('PROFILES_FETCH', '✅ Berhasil fetch profiles dari cloud', { count: profiles.length });
    return { profiles, rumahList };
  } catch (e: any) {
    dbLog('PROFILES_FETCH', '❌ Exception:', e?.message);
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
  if (!client) {
    dbLog('EVENTS_SYNC', '⚠️ Supabase client NULL — event/kupon hanya di localStorage');
    return;
  }

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
      const { error } = await client.from('events').upsert(evtRecords, { onConflict: 'id' });
      if (error) dbLog('EVENTS_SYNC', '❌ Events upsert error:', error.message);
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
      const { error } = await client.from('tenant_booths').upsert(bthRecords, { onConflict: 'id' });
      if (error) dbLog('EVENTS_SYNC', '❌ Booths upsert error:', error.message);
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
      const { error } = await client.from('kupons').upsert(kpnRecords, { onConflict: 'id' });
      if (error) dbLog('EVENTS_SYNC', '❌ Kupons upsert error:', error.message);
      else dbLog('EVENTS_SYNC', '✅ Kupons synced to cloud', { count: kupons.length });
    }
  } catch (e: any) {
    dbLog('EVENTS_SYNC', '❌ Exception:', e?.message);
  }
}

export async function fetchKuponsFromCloud(nomorRumahInput?: string): Promise<any[] | null> {
  const client = createClient();
  if (!client) {
    dbLog('KUPONS_FETCH', '⚠️ Supabase client NULL — skip cloud kupon fetch');
    return null;
  }

  try {
    const { data, error } = await client.from('kupons').select('*');
    if (error) {
      dbLog('KUPONS_FETCH', '❌ Query error:', error.message);
      return null;
    }
    if (!data) {
      dbLog('KUPONS_FETCH', '⚠️ No data returned');
      return null;
    }
    dbLog('KUPONS_FETCH', '✅ Fetched kupons from cloud', { total: data.length });
    if (nomorRumahInput) {
      const targetClean = cleanHouseNo(nomorRumahInput);
      const filtered = data.filter((k) => cleanHouseNo(k.nomor_rumah) === targetClean);
      dbLog('KUPONS_FETCH', `  → Filtered for ${nomorRumahInput}:`, { count: filtered.length });
      return filtered;
    }
    return data;
  } catch (e: any) {
    dbLog('KUPONS_FETCH', '❌ Exception:', e?.message);
    return null;
  }
}

// ── 4. IURAN CONFIG CLOUD SYNC ──────────────────────────────
export async function syncIuranConfigToCloud(config: any) {
  const client = createClient();
  if (!client) {
    dbLog('CONFIG_SYNC', '⚠️ Supabase client NULL — config hanya di localStorage');
    return;
  }

  try {
    const { error } = await client.from('app_config').upsert(
      [
        {
          id: 'iuran_config_v1',
          data: config,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: 'id' }
    );
    if (error) {
      dbLog('CONFIG_SYNC', '❌ Config sync error:', error.message);
    } else {
      dbLog('CONFIG_SYNC', '✅ Config synced to cloud', { nominal: config.nominal_per_bulan });
    }
  } catch (e: any) {
    dbLog('CONFIG_SYNC', '❌ Exception:', e?.message);
  }
}

export async function fetchIuranConfigFromCloud(): Promise<any | null> {
  const client = createClient();
  if (!client) {
    dbLog('CONFIG_FETCH', '⚠️ Supabase client NULL — config dari localStorage saja');
    return null;
  }

  try {
    const { data, error } = await client.from('app_config').select('*').eq('id', 'iuran_config_v1').single();
    if (error) {
      dbLog('CONFIG_FETCH', '❌ Config fetch error:', error.message);
      return null;
    }
    if (data && data.data) {
      dbLog('CONFIG_FETCH', '✅ Config fetched from cloud', { nominal: data.data.nominal_per_bulan });
      // Also save to localStorage so it persists across tabs
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('martinez_iuran_config_v1', JSON.stringify(data.data));
        } catch (e) {}
      }
      return data.data;
    }
    dbLog('CONFIG_FETCH', '⚠️ Config data null/empty in cloud');
    return null;
  } catch (e: any) {
    dbLog('CONFIG_FETCH', '❌ Exception:', e?.message);
    return null;
  }
}

// ── 5. ADMIN USERS CLOUD SYNC ──────────────────────────────
export async function syncAdminUsersToCloud(users: any[]) {
  const client = createClient();
  if (!client) {
    dbLog('ADMIN_SYNC', '⚠️ Supabase client NULL — data hanya di localStorage');
    return;
  }

  try {
    const { error } = await client.from('admin_users').upsert(
      users.map(u => ({
        id: u.id,
        username: u.username,
        nama: u.nama,
        role: u.role,
        password: u.password,
        created_at: u.created_at || new Date().toISOString()
      })),
      { onConflict: 'id' }
    );
    if (error) {
      dbLog('ADMIN_SYNC', '❌ Admin sync error:', error.message);
    } else {
      dbLog('ADMIN_SYNC', '✅ Admin users synced to cloud', { count: users.length });
    }
  } catch (e: any) {
    dbLog('ADMIN_SYNC', '❌ Exception:', e?.message);
  }
}

export async function fetchAdminUsersFromCloud(): Promise<any[] | null> {
  const client = createClient();
  if (!client) {
    dbLog('ADMIN_FETCH', '⚠️ Supabase client NULL — admin dari localStorage saja');
    return null;
  }

  try {
    const { data, error } = await client.from('admin_users').select('*');
    if (error) {
      dbLog('ADMIN_FETCH', '❌ Admin fetch error:', error.message);
      return null;
    }
    if (data && Array.isArray(data) && data.length > 0) {
      dbLog('ADMIN_FETCH', '✅ Admin users fetched from cloud', { count: data.length });
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('martinez_admin_users_v2', JSON.stringify(data));
        } catch (e) {}
      }
      return data;
    }
    dbLog('ADMIN_FETCH', '⚠️ Admin users kosong di cloud');
    return null;
  } catch (e: any) {
    dbLog('ADMIN_FETCH', '❌ Exception:', e?.message);
    return null;
  }
}
export async function clearAllEventsAndKuponsCloud() {
  const client = createClient();
  if (!client) {
    dbLog('CLEAR_EVENTS', '⚠️ Supabase client NULL — hanya clear localStorage');
    return;
  }
  try {
    await client.from('kupons').delete().gte('created_at', '1970-01-01');
    await client.from('tenant_booths').delete().gte('created_at', '1970-01-01');
    await client.from('events').delete().gte('created_at', '1970-01-01');
    dbLog('CLEAR_EVENTS', '✅ All events/kupons/booths cleared from cloud');
  } catch (e: any) {
    dbLog('CLEAR_EVENTS', '❌ Exception:', e?.message);
  }
}

// ── 5. DATABASE TABLE HEALTH CHECK ──────────────────────────
export type TableStatus = { name: string; exists: boolean; rowCount: number; error?: string };

export async function checkSupabaseTableStatus(): Promise<{ connected: boolean; tables: TableStatus[] }> {
  const client = createClient();
  if (!client) {
    return { connected: false, tables: [] };
  }

  const tableNames = ['rumah', 'profiles', 'iuran_matrix', 'app_config', 'events', 'kupons', 'tenant_booths'];
  const results: TableStatus[] = [];

  for (const name of tableNames) {
    try {
      const { data, error, count } = await client.from(name).select('*', { count: 'exact', head: true });
      if (error) {
        // Error code 42P01 = table doesn't exist in PostgreSQL
        const notExist = error.message?.includes('does not exist') || error.code === '42P01' || error.message?.includes('relation');
        results.push({ name, exists: !notExist, rowCount: 0, error: error.message });
      } else {
        results.push({ name, exists: true, rowCount: count || 0 });
      }
    } catch (e: any) {
      results.push({ name, exists: false, rowCount: 0, error: e?.message });
    }
  }

  return { connected: true, tables: results };
}

export function getMissingTablesSQL(): string {
  return `-- ============================================================
-- SQL untuk membuat tabel yang BELUM ADA di Supabase
-- Jalankan di: Supabase Dashboard > SQL Editor > New Query
-- Super App Cluster Martinez
-- ============================================================

-- 1. Tabel app_config (untuk menyimpan konfigurasi iuran)
CREATE TABLE IF NOT EXISTS app_config (
  id TEXT PRIMARY KEY,
  data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read app_config" ON app_config FOR SELECT USING (true);
CREATE POLICY "Allow public insert app_config" ON app_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update app_config" ON app_config FOR UPDATE USING (true);

-- 2. Tabel events (untuk menyimpan acara/event kluster)
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  nama_event TEXT NOT NULL DEFAULT '',
  nama_kupon TEXT DEFAULT '',
  tanggal_event TEXT DEFAULT '',
  lokasi_event TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  rules JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read events" ON events FOR SELECT USING (true);
CREATE POLICY "Allow public insert events" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update events" ON events FOR UPDATE USING (true);
CREATE POLICY "Allow public delete events" ON events FOR DELETE USING (true);

-- 3. Tabel kupons (untuk menyimpan kupon acara warga)
CREATE TABLE IF NOT EXISTS kupons (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  nama_event TEXT DEFAULT '',
  nama_kupon TEXT DEFAULT '',
  kategori_id TEXT DEFAULT 'cat-1',
  kategori_nama TEXT DEFAULT 'Kupon Event',
  warga_id TEXT DEFAULT '',
  nomor_rumah TEXT DEFAULT '',
  tahun INTEGER DEFAULT extract(year from current_date),
  kode_kupon TEXT DEFAULT '',
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  used_by_booth_id TEXT,
  used_by_booth_nama TEXT,
  used_by_admin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE kupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read kupons" ON kupons FOR SELECT USING (true);
CREATE POLICY "Allow public insert kupons" ON kupons FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update kupons" ON kupons FOR UPDATE USING (true);
CREATE POLICY "Allow public delete kupons" ON kupons FOR DELETE USING (true);

-- 4. Tabel tenant_booths (untuk akun booth makanan saat acara)
CREATE TABLE IF NOT EXISTS tenant_booths (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  nama_booth TEXT DEFAULT '',
  username TEXT DEFAULT '',
  password TEXT DEFAULT '',
  total_scanned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE tenant_booths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read tenant_booths" ON tenant_booths FOR SELECT USING (true);
CREATE POLICY "Allow public insert tenant_booths" ON tenant_booths FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update tenant_booths" ON tenant_booths FOR UPDATE USING (true);
CREATE POLICY "Allow public delete tenant_booths" ON tenant_booths FOR DELETE USING (true);

-- Selesai! Refresh halaman admin setelah menjalankan SQL ini.

-- =========================================================================
-- TOKO MARTINEZ INVENTORY & SALES SYSTEM
-- =========================================================================

-- 5. Tabel toko_barang (Master Barang)
CREATE TABLE IF NOT EXISTS toko_barang (
  id TEXT PRIMARY KEY,
  nama_barang TEXT NOT NULL,
  kategori TEXT DEFAULT 'Umum',
  satuan_besar TEXT DEFAULT 'Dus',
  satuan_kecil TEXT DEFAULT 'Botol',
  qty_per_satuan_besar INTEGER DEFAULT 1,
  harga_beli_satuan_besar INTEGER DEFAULT 0,
  harga_jual_satuan_kecil INTEGER DEFAULT 0,
  stok_gudang INTEGER DEFAULT 0, -- Dalam satuan kecil
  stok_display INTEGER DEFAULT 0, -- Dalam satuan kecil
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE toko_barang ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read toko_barang" ON toko_barang FOR SELECT USING (true);
CREATE POLICY "Allow public insert toko_barang" ON toko_barang FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update toko_barang" ON toko_barang FOR UPDATE USING (true);
CREATE POLICY "Allow public delete toko_barang" ON toko_barang FOR DELETE USING (true);

-- 6. Tabel toko_pergerakan_stok (Log masuk barang dan pindah gudang ke display)
CREATE TABLE IF NOT EXISTS toko_pergerakan_stok (
  id TEXT PRIMARY KEY,
  barang_id TEXT REFERENCES toko_barang(id) ON DELETE CASCADE,
  jenis_pergerakan TEXT NOT NULL, -- 'PEMBELIAN_GUDANG' atau 'PINDAH_DISPLAY'
  jumlah_satuan_besar INTEGER DEFAULT 0,
  jumlah_satuan_kecil INTEGER NOT NULL,
  catatan TEXT,
  dibuat_oleh TEXT DEFAULT 'Admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE toko_pergerakan_stok ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read toko_pergerakan_stok" ON toko_pergerakan_stok FOR SELECT USING (true);
CREATE POLICY "Allow public insert toko_pergerakan_stok" ON toko_pergerakan_stok FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update toko_pergerakan_stok" ON toko_pergerakan_stok FOR UPDATE USING (true);
CREATE POLICY "Allow public delete toko_pergerakan_stok" ON toko_pergerakan_stok FOR DELETE USING (true);

-- 7. Tabel toko_penjualan (Transaksi Penjualan Harian Kasir)
CREATE TABLE IF NOT EXISTS toko_penjualan (
  id TEXT PRIMARY KEY,
  barang_id TEXT REFERENCES toko_barang(id) ON DELETE CASCADE,
  jumlah_satuan_kecil INTEGER NOT NULL,
  harga_satuan INTEGER NOT NULL,
  total_harga INTEGER NOT NULL,
  dijual_oleh TEXT DEFAULT 'Kasir',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE toko_penjualan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read toko_penjualan" ON toko_penjualan FOR SELECT USING (true);
CREATE POLICY "Allow public insert toko_penjualan" ON toko_penjualan FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update toko_penjualan" ON toko_penjualan FOR UPDATE USING (true);
CREATE POLICY "Allow public delete toko_penjualan" ON toko_penjualan FOR DELETE USING (true);

`;
}
