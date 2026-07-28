// ============================================================
// Event, Kupon, & Tenant Booth Store Helper
// Manages Event Creation with Leveling Rules, Tenant Booth Accounts,
// Manual Coupon Field Creation, Booth QR Scanning & Real-time Reports
// Super App Cluster Martinez
// ============================================================

import type { EventAcara, KuponAcara, IuranMatrixRow, CouponRules, TenantBooth, KuponCategory, DynamicCouponRuleTier } from '@/types';
import { createClient } from '@/lib/supabase/client';

const STORAGE_KEY_EVENTS = 'martinez_events_v1';
const STORAGE_KEY_KUPONS = 'martinez_kupons_v1';
const STORAGE_KEY_BOOTHS = 'martinez_booths_v1';
const STORAGE_KEY_IURAN = 'martinez_iuran_matrix_v2';

const cleanHouseNo = (s: string) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export const DEFAULT_CATEGORIES: KuponCategory[] = [
  { id: 'cat-1', nama_kategori: 'Kupon Makanan Utama' },
];

export const DEFAULT_TIERS: DynamicCouponRuleTier[] = [
  {
    id: 'tr-1',
    nama_tier: 'Tier Full Bayar (≥ 8 Bulan Lunas)',
    min_lunas_bulan: 8,
    kupon_per_category: { 'cat-1': 1 },
  },
];

export const DEFAULT_RULES: CouponRules = {
  categories: DEFAULT_CATEGORIES,
  tiers: DEFAULT_TIERS,
  tier1_min_bulan: 8,
  tier1_kupon: 1,
  tidak_bayar_0: 0,
};

export const DEFAULT_EVENTS: EventAcara[] = [];
export const DEFAULT_BOOTHS: TenantBooth[] = [];

export function getEventsFromStorage(): EventAcara[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY_EVENTS);
    if (saved !== null) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function getKuponsFromStorage(): KuponAcara[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY_KUPONS);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function getBoothsFromStorage(): TenantBooth[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY_BOOTHS);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error(e);
  }
  return [];
}

function _saveEvents(events: EventAcara[]) {
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
}
function _saveKupons(kupons: KuponAcara[]) {
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY_KUPONS, JSON.stringify(kupons));
}
function _saveBooths(booths: TenantBooth[]) {
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY_BOOTHS, JSON.stringify(booths));
}

// ── Async Cloud Upsert Helper ───────────────────────────────
async function upsertToCloud(events: EventAcara[], kupons: KuponAcara[], booths: TenantBooth[]) {
  const client = createClient();
  if (!client) {
    console.warn('[EVENT-STORE] Supabase client NULL — hanya simpan di localStorage');
    return { cloudOk: false, error: 'Supabase tidak terhubung' };
  }

  try {
    const chunkSize = 100;
    
    if (events.length > 0) {
      const { error: eErr } = await client.from('events').upsert(events, { onConflict: 'id' });
      if (eErr) throw new Error('Events: ' + eErr.message);
    }

    if (booths.length > 0) {
      const { error: bErr } = await client.from('tenant_booths').upsert(booths, { onConflict: 'id' });
      if (bErr) throw new Error('Booths: ' + bErr.message);
    }

    if (kupons.length > 0) {
      const safeKupons = kupons.map(k => ({
        id: k.id,
        event_id: k.event_id,
        nama_event: k.nama_event,
        nama_kupon: k.nama_kupon,
        kategori_id: k.kategori_id || 'cat-1',
        kategori_nama: k.kategori_nama || 'Kupon Event',
        warga_id: k.warga_id,
        nomor_rumah: k.nomor_rumah,
        tahun: k.tahun || new Date().getFullYear(),
        kode_kupon: k.kode_kupon,
        is_used: k.is_used,
        used_at: k.used_at,
        used_by_booth_id: k.used_by_booth_id,
        used_by_booth_nama: k.used_by_booth_nama,
        used_by_admin: k.used_by_admin,
        created_at: k.created_at
      }));

      for (let i = 0; i < safeKupons.length; i += chunkSize) {
        const chunk = safeKupons.slice(i, i + chunkSize);
        const { error: kErr } = await client.from('kupons').upsert(chunk, { onConflict: 'id' });
        if (kErr) throw new Error('Kupons: ' + kErr.message);
      }
    }
    
    return { cloudOk: true };
  } catch (err: any) {
    console.error('[EVENT-STORE] Upsert error:', err);
    return { cloudOk: false, error: err.message };
  }
}

export function calculateKuponForHouse(
  lunasCount: number,
  rules: CouponRules
): number {
  if (!rules) return 0;
  const t1Min = rules.tier1_min_bulan ?? 8;
  const t1Kupon = rules.tier1_kupon ?? rules.full_lunas_12 ?? 5;
  const t2Min = rules.tier2_min_bulan ?? 5;
  const t2Kupon = rules.tier2_kupon ?? rules.rajin_8_11 ?? 3;
  const t3Min = rules.tier3_min_bulan ?? 1;
  const t3Kupon = rules.tier3_kupon ?? rules.bolong_1_7 ?? 1;

  if (lunasCount >= t1Min) return t1Kupon;
  if (lunasCount >= t2Min) return t2Kupon;
  if (lunasCount >= t3Min) return t3Kupon;
  return rules.tidak_bayar_0 ?? 0;
}

export async function createEventAndGenerateKupons(
  eventData: {
    nama_event: string;
    nama_kupon: string;
    tanggal_event: string;
    lokasi_event: string;
    rules: CouponRules;
    booths: { nama_booth: string; username: string; password: string }[];
  },
  matrix: IuranMatrixRow[]
): Promise<{ newEvent: EventAcara; createdKuponsCount: number; cloudOk: boolean; error?: string }> {
  const events = getEventsFromStorage();
  const currentKupons = getKuponsFromStorage();
  const currentBooths = getBoothsFromStorage();

  const newEventId = `evt-${Date.now()}`;
  const newEvent: EventAcara = {
    id: newEventId,
    nama_event: eventData.nama_event,
    nama_kupon: eventData.nama_kupon,
    tanggal_event: eventData.tanggal_event,
    lokasi_event: eventData.lokasi_event,
    rules: eventData.rules || DEFAULT_RULES,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  const newGeneratedKupons: KuponAcara[] = [];
  const tahun = new Date().getFullYear();
  const rules = eventData.rules || DEFAULT_RULES;
  const categories = rules.categories || DEFAULT_CATEGORIES;
  const tiers = rules.tiers || DEFAULT_TIERS;

  matrix.forEach((row) => {
    let lunasCount = 0;
    for (let m = 1; m <= 12; m++) {
      if (row.bulan[m] === 'lunas') lunasCount++;
    }

    let requiredMonths = 12;
    try {
      if (typeof window !== 'undefined') {
        const savedProfiles = localStorage.getItem('martinez_profiles_list_v3');
        const savedRumah = localStorage.getItem('martinez_rumah_list_v3');
        if (savedProfiles && savedRumah) {
          const parsedProfiles: any[] = JSON.parse(savedProfiles);
          const parsedRumah: any[] = JSON.parse(savedRumah);
          const targetRumah = parsedRumah.find((r) => cleanHouseNo(r.nomor_rumah) === cleanHouseNo(row.nomor_rumah));
          if (targetRumah) {
            const prof = parsedProfiles.find((p) => p.rumah_id === targetRumah.id);
            if (prof && prof.tanggal_masuk) {
              const entryDate = new Date(prof.tanggal_masuk);
              if (!isNaN(entryDate.getTime()) && entryDate.getFullYear() === tahun) {
                const entryMonth = entryDate.getMonth() + 1;
                requiredMonths = Math.max(1, 12 - entryMonth + 1);
              }
            }
          }
        }
      }
    } catch (e) {}

    const effectiveMonths = Math.min(12, Math.round((lunasCount / requiredMonths) * 12));
    const sortedTiers = [...tiers].sort((a, b) => b.min_lunas_bulan - a.min_lunas_bulan);
    const matchedTier = sortedTiers.find((t) => effectiveMonths >= t.min_lunas_bulan);
    const cleanNo = cleanHouseNo(row.nomor_rumah);

    if (matchedTier && matchedTier.kupon_per_category) {
      categories.forEach((cat) => {
        const qty = matchedTier.kupon_per_category[cat.id] || 0;
        for (let k = 1; k <= qty; k++) {
          const randomCode = generateRandom8();
          const kodeKupon = `${cleanNo}-${randomCode}`;
          newGeneratedKupons.push({
            id: `kpn-${newEventId}-${cleanNo}-${cat.id}-${k}-${Date.now()}`,
            event_id: newEventId,
            nama_event: eventData.nama_event,
            nama_kupon: cat.nama_kategori,
            kategori_id: cat.id,
            kategori_nama: cat.nama_kategori,
            warga_id: row.rumah_id,
            nomor_rumah: row.nomor_rumah,
            tahun,
            kode_kupon: kodeKupon,
            is_used: false,
            used_at: null,
            created_at: new Date().toISOString(),
          });
        }
      });
    } else {
      const totalKuponsForHouse = calculateKuponForHouse(lunasCount, rules);
      if (totalKuponsForHouse > 0) {
        const cat = categories[0] || { id: 'cat-1', nama_kategori: 'Kupon Event' };
        for (let k = 1; k <= totalKuponsForHouse; k++) {
          const randomCode = generateRandom8();
          const kodeKupon = `${cleanNo}-${randomCode}`;
          newGeneratedKupons.push({
            id: `kpn-${newEventId}-${cleanNo}-${k}-${Date.now()}`,
            event_id: newEventId,
            nama_event: eventData.nama_event,
            nama_kupon: cat.nama_kategori,
            kategori_id: cat.id,
            kategori_nama: cat.nama_kategori,
            warga_id: row.rumah_id,
            nomor_rumah: row.nomor_rumah,
            tahun,
            kode_kupon: kodeKupon,
            is_used: false,
            used_at: null,
            created_at: new Date().toISOString(),
          });
        }
      }
    }
  });

  const newBooths: TenantBooth[] = (eventData.booths || []).map((b, idx) => ({
    id: `bth-${newEventId}-${idx + 1}`,
    event_id: newEventId,
    nama_booth: b.nama_booth || `Booth Makanan #${idx + 1}`,
    username: b.username ? b.username.trim().toLowerCase() : `booth-${newEventId.slice(-4)}-${idx + 1}`,
    password: b.password || 'event123',
    total_scanned: 0,
    created_at: new Date().toISOString(),
  }));

  const updatedEvents = [newEvent, ...events];
  const updatedKupons = [...newGeneratedKupons, ...currentKupons];
  const updatedBooths = [...newBooths, ...currentBooths];

  _saveEvents(updatedEvents);
  _saveKupons(updatedKupons);
  _saveBooths(updatedBooths);

  const res = await upsertToCloud([newEvent], newGeneratedKupons, newBooths);

  return { newEvent, createdKuponsCount: newGeneratedKupons.length, cloudOk: res.cloudOk, error: res.error };
}

function generateRandom8(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let res = '';
  for (let i = 0; i < 8; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

export function getKuponsForWarga(nomorRumahInput: string): KuponAcara[] {
  const allKupons = getKuponsFromStorage();
  const targetClean = cleanHouseNo(nomorRumahInput);
  return allKupons.filter((k) => cleanHouseNo(k.nomor_rumah) === targetClean);
}

export async function addManualKupon(
  eventId: string,
  nomorRumah: string,
  count: number = 1
): Promise<{ newKupons: KuponAcara[]; cloudOk: boolean; error?: string }> {
  const events = getEventsFromStorage();
  const allKupons = getKuponsFromStorage();

  const event = events.find((e) => e.id === eventId) || events[0];
  const tahun = new Date().getFullYear();
  const cleanNo = cleanHouseNo(nomorRumah);
  const catNama = event?.rules?.categories?.[0]?.nama_kategori || 'Kupon Event';

  const newKupons: KuponAcara[] = [];
  for (let k = 1; k <= count; k++) {
    const randomCode = generateRandom8();
    const kodeKupon = `${cleanNo}-${randomCode}`;
    const newKupon: KuponAcara = {
      id: `kpn-manual-${Date.now()}-${k}`,
      event_id: event ? event.id : 'evt-001',
      nama_event: event ? event.nama_event : 'Doorprize Kluster',
      nama_kupon: catNama,
      kategori_id: 'cat-1',
      kategori_nama: catNama,
      warga_id: `r-${cleanNo}`,
      nomor_rumah: nomorRumah,
      tahun,
      kode_kupon: kodeKupon,
      is_used: false,
      used_at: null,
      created_at: new Date().toISOString(),
    };
    newKupons.push(newKupon);
  }

  const updatedKupons = [...newKupons, ...allKupons];
  _saveKupons(updatedKupons);
  
  const res = await upsertToCloud([], newKupons, []);

  return { newKupons, cloudOk: res.cloudOk, error: res.error };
}

export async function scanAndUseKuponByBooth(
  kodeKuponInput: string,
  boothId?: string,
  boothNama?: string
): Promise<{ success: boolean; message: string; kupon?: KuponAcara }> {
  const allKupons = getKuponsFromStorage();
  const allBooths = getBoothsFromStorage();
  const cleanInput = kodeKuponInput.trim().toUpperCase();

  const kuponIndex = allKupons.findIndex((k) => k.kode_kupon.toUpperCase() === cleanInput);
  if (kuponIndex === -1) {
    return { success: false, message: `Kode Kupon "${kodeKuponInput}" TIDAK DITEMUKAN dalam sistem!` };
  }

  const kupon = allKupons[kuponIndex];
  if (kupon.is_used) {
    const usedWhere = kupon.used_by_booth_nama
      ? `di ${kupon.used_by_booth_nama}`
      : kupon.used_by_admin
        ? `oleh Admin (${kupon.used_by_admin})`
        : '';
    return {
      success: false,
      message: `Kupon "${kupon.kode_kupon}" (${kupon.nomor_rumah}) SUDAH DIGUNAKAN sebelumnya ${usedWhere} pada ${
        kupon.used_at ? new Date(kupon.used_at).toLocaleTimeString('id-ID') : ''
      }!`,
      kupon,
    };
  }

  const updatedKupon: KuponAcara = {
    ...kupon,
    is_used: true,
    used_at: new Date().toISOString(),
    used_by_booth_id: boothId || null,
    used_by_booth_nama: boothNama || 'Admin Verifier',
    used_by_admin: boothNama || 'Admin Verifier',
  };

  allKupons[kuponIndex] = updatedKupon;
  _saveKupons(allKupons);

  let updatedBooth: TenantBooth | null = null;
  if (boothId || boothNama) {
    const bIndex = allBooths.findIndex(
      (b) => (boothId && b.id === boothId) || (boothId && b.username === boothId) || (boothNama && b.nama_booth === boothNama)
    );
    if (bIndex !== -1) {
      allBooths[bIndex].total_scanned = (allBooths[bIndex].total_scanned || 0) + 1;
      updatedBooth = allBooths[bIndex];
      _saveBooths(allBooths);
    }
  }

  const boothsToUpdate = updatedBooth ? [updatedBooth] : [];
  await upsertToCloud([], [updatedKupon], boothsToUpdate);

  return {
    success: true,
    message: `KUPON VALID! Berhasil ditukar untuk ${kupon.nomor_rumah} di ${boothNama || 'Booth'}.`,
    kupon: updatedKupon,
  };
}

export async function scanAndUseKupon(
  kodeKuponInput: string,
  adminName: string
): Promise<{ success: boolean; message: string; kupon?: KuponAcara }> {
  return scanAndUseKuponByBooth(kodeKuponInput, undefined, adminName);
}

export function getBoothReportForEvent(eventId: string) {
  const allBooths = getBoothsFromStorage().filter((b) => b.event_id === eventId);
  const allKupons = getKuponsFromStorage().filter((k) => k.event_id === eventId);
  const totalEventKupons = allKupons.length;
  const totalUsedKupons = allKupons.filter((k) => k.is_used).length;
  const boothStats = allBooths.map((booth) => {
    const redeemedKupons = allKupons.filter((k) => k.used_by_booth_id === booth.id);
    return {
      booth,
      countScanned: redeemedKupons.length,
      percentage: totalUsedKupons > 0 ? Math.round((redeemedKupons.length / totalUsedKupons) * 100) : 0,
      details: redeemedKupons,
    };
  });
  return {
    eventId,
    totalEventKupons,
    totalUsedKupons,
    totalUnusedKupons: totalEventKupons - totalUsedKupons,
    boothStats,
  };
}

export async function deleteEvent(eventId: string): Promise<void> {
  const events = getEventsFromStorage().filter((e) => e.id !== eventId);
  const kupons = getKuponsFromStorage().filter((k) => k.event_id !== eventId);
  const booths = getBoothsFromStorage().filter((b) => b.event_id !== eventId);
  _saveEvents(events);
  _saveKupons(kupons);
  _saveBooths(booths);

  const client = createClient();
  if (client) {
    await client.from('events').delete().eq('id', eventId);
  }
}

export async function deleteKupon(kuponId: string): Promise<void> {
  const kupons = getKuponsFromStorage().filter((k) => k.id !== kuponId);
  _saveKupons(kupons);
  
  const client = createClient();
  if (client) {
    await client.from('kupons').delete().eq('id', kuponId);
  }
}

export async function authenticateBooth(username: string, password: string): Promise<{ success: boolean; booth?: TenantBooth; error?: string }> {
  const client = createClient();
  if (client) {
    const { data, error } = await client
      .from('tenant_booths')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !data) {
      return { success: false, error: 'Username booth atau password booth salah. Atau booth tidak terdaftar.' };
    }
    return { success: true, booth: data as TenantBooth };
  } else {
    // Fallback to local
    const booths = getBoothsFromStorage();
    const booth = booths.find((b) => b.username === username && b.password === password);
    if (!booth) {
      return { success: false, error: 'Username booth atau password booth salah. Atau booth tidak terdaftar.' };
    }
    return { success: true, booth };
  }
}
