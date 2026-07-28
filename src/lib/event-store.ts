// ============================================================
// Event, Kupon, & Tenant Booth Store Helper
// Manages Event Creation with Leveling Rules, Tenant Booth Accounts,
// Manual Coupon Field Creation, Booth QR Scanning & Real-time Reports
// Super App Cluster Martinez
// ============================================================

import type { EventAcara, KuponAcara, IuranMatrixRow, CouponRules, TenantBooth, KuponCategory, DynamicCouponRuleTier } from '@/types';
import { syncEventsAndKuponsToCloud } from '@/lib/db-sync';

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

// Initial Default Event if empty
export const DEFAULT_EVENTS: EventAcara[] = [
  {
    id: 'evt-001',
    nama_event: 'Acara HUT RI Kluster Martinez',
    nama_kupon: 'Kupon Acara Utama',
    tanggal_event: new Date().toISOString().split('T')[0],
    lokasi_event: 'Lapangan Serbaguna Kluster',
    rules: DEFAULT_RULES,
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

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

export function saveEventsToStorage(events: EventAcara[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
    syncEventsAndKuponsToCloud(events, getKuponsFromStorage(), getBoothsFromStorage());
  } catch (e) {
    console.error(e);
  }
}

export function getKuponsFromStorage(): KuponAcara[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY_KUPONS);
    if (saved !== null) {
      const parsed: KuponAcara[] = JSON.parse(saved);
      const activeEvents = getEventsFromStorage();
      if (activeEvents.length === 0) return [];
      const validEventIds = new Set(activeEvents.map((e) => e.id));
      return parsed.filter((k) => validEventIds.has(k.event_id));
    }
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function saveKuponsToStorage(kupons: KuponAcara[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_KUPONS, JSON.stringify(kupons));
    syncEventsAndKuponsToCloud(getEventsFromStorage(), kupons, getBoothsFromStorage());
  } catch (e) {
    console.error(e);
  }
}

export function getBoothsFromStorage(): TenantBooth[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY_BOOTHS);
    if (saved !== null) {
      const parsed: TenantBooth[] = JSON.parse(saved);
      const activeEvents = getEventsFromStorage();
      if (activeEvents.length === 0) return [];
      const validEventIds = new Set(activeEvents.map((e) => e.id));
      return parsed.filter((b) => b.event_id && validEventIds.has(b.event_id));
    }
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function saveBoothsToStorage(booths: TenantBooth[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_BOOTHS, JSON.stringify(booths));
    syncEventsAndKuponsToCloud(getEventsFromStorage(), getKuponsFromStorage(), booths);
  } catch (e) {
    console.error(e);
  }
}

// ── Calculate Kupon Count based on Leveling Rules ───────────
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

// ── Create Event & Auto-Generate Kupon Warga ───────────────
export function createEventAndGenerateKupons(
  eventData: {
    nama_event: string;
    nama_kupon: string;
    tanggal_event: string;
    lokasi_event: string;
    rules: CouponRules;
    booths: { nama_booth: string; username: string; password: string }[];
  },
  matrix: IuranMatrixRow[]
): { newEvent: EventAcara; createdKuponsCount: number } {
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

  // Generate Kupons for Warga
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

    // Calculate required months based on Tanggal Masuk (Move-in date)
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
                const entryMonth = entryDate.getMonth() + 1; // 1..12
                requiredMonths = Math.max(1, 12 - entryMonth + 1);
              }
            }
          }
        }
      }
    } catch (e) {}

    // Calculate Effective Paid Months normalized to 12-month scale
    const effectiveMonths = Math.min(12, Math.round((lunasCount / requiredMonths) * 12));

    const sortedTiers = [...tiers].sort((a, b) => b.min_lunas_bulan - a.min_lunas_bulan);
    const matchedTier = sortedTiers.find((t) => effectiveMonths >= t.min_lunas_bulan);

    if (matchedTier && matchedTier.kupon_per_category) {
      let kuponSeq = 1;
      categories.forEach((cat) => {
        const qty = matchedTier.kupon_per_category[cat.id] || 0;
        for (let k = 1; k <= qty; k++) {
          const cleanNo = row.nomor_rumah.replace(/[^a-zA-Z0-9]/g, '');
          const kodeKupon = `MTZ-${cleanNo}-${tahun}-${mPad(kuponSeq)}`;

          newGeneratedKupons.push({
            id: `kpn-${newEventId}-${cleanNo}-${kuponSeq}`,
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
          kuponSeq++;
        }
      });
    } else {
      const totalKuponsForHouse = calculateKuponForHouse(lunasCount, rules);
      for (let k = 1; k <= totalKuponsForHouse; k++) {
        const cleanNo = row.nomor_rumah.replace(/[^a-zA-Z0-9]/g, '');
        const kodeKupon = `MTZ-${cleanNo}-${tahun}-${mPad(k)}`;

        newGeneratedKupons.push({
          id: `kpn-${newEventId}-${cleanNo}-${k}`,
          event_id: newEventId,
          nama_event: eventData.nama_event,
          nama_kupon: eventData.nama_kupon,
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
  });

  // Generate Booth Accounts for this Event
  const newBooths: TenantBooth[] = (eventData.booths || []).map((b, idx) => ({
    id: `bth-${newEventId}-${idx + 1}`,
    event_id: newEventId,
    nama_booth: b.nama_booth || `Booth Makanan #${idx + 1}`,
    username: b.username || `booth-${newEventId.slice(-4)}-${idx + 1}`,
    password: b.password || 'event123',
    total_scanned: 0,
    created_at: new Date().toISOString(),
  }));

  const updatedEvents = [newEvent, ...events];
  const updatedKupons = [...newGeneratedKupons, ...currentKupons];
  const updatedBooths = [...newBooths, ...currentBooths];

  saveEventsToStorage(updatedEvents);
  saveKuponsToStorage(updatedKupons);
  saveBoothsToStorage(updatedBooths);

  return { newEvent, createdKuponsCount: newGeneratedKupons.length };
}

function mPad(n: number): string {
  return n.toString().padStart(2, '0');
}

// ── Manual Coupon Creation for Field Correction ─────────────
export function addManualKupon(
  eventId: string,
  nomorRumah: string,
  count: number = 1
): KuponAcara[] {
  const events = getEventsFromStorage();
  const allKupons = getKuponsFromStorage();

  const event = events.find((e) => e.id === eventId) || events[0];
  const tahun = new Date().getFullYear();
  const cleanNo = nomorRumah.replace(/[^a-zA-Z0-9]/g, '');

  const newKupons: KuponAcara[] = [];
  for (let k = 1; k <= count; k++) {
    const timestamp = Date.now().toString().slice(-4);
    const kodeKupon = `MTZ-MANUAL-${cleanNo}-${timestamp}-${k}`;

    const newKupon: KuponAcara = {
      id: `kpn-manual-${Date.now()}-${k}`,
      event_id: event ? event.id : 'evt-001',
      nama_event: event ? event.nama_event : 'Doorprize Kluster',
      nama_kupon: event ? event.nama_kupon : 'Kupon Manual Koreksi',
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
  saveKuponsToStorage(updatedKupons);
  return newKupons;
}

// ── Get Real Kupons for Specific Warga ─────────────────────
export function getKuponsForWarga(nomorRumah: string): KuponAcara[] {
  const allKupons = getKuponsFromStorage();
  const targetClean = cleanHouseNo(nomorRumah);
  return allKupons.filter((k) => cleanHouseNo(k.nomor_rumah) === targetClean);
}

// ── Scan & Verify Kupon by Admin OR Tenant Booth ────────────
export function scanAndUseKuponByBooth(
  kodeKuponInput: string,
  boothId?: string,
  boothNama?: string
): { success: boolean; message: string; kupon?: KuponAcara } {
  const allKupons = getKuponsFromStorage();
  const allBooths = getBoothsFromStorage();
  const cleanInput = kodeKuponInput.trim().toUpperCase();

  const kuponIndex = allKupons.findIndex(
    (k) => k.kode_kupon.toUpperCase() === cleanInput
  );

  if (kuponIndex === -1) {
    return {
      success: false,
      message: `Kode Kupon "${kodeKuponInput}" TIDAK DITEMUKAN dalam sistem!`,
    };
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

  // Mark as USED by Booth
  const updatedKupon: KuponAcara = {
    ...kupon,
    is_used: true,
    used_at: new Date().toISOString(),
    used_by_booth_id: boothId || null,
    used_by_booth_nama: boothNama || 'Admin Verifier',
    used_by_admin: boothNama || 'Admin Verifier',
  };

  allKupons[kuponIndex] = updatedKupon;
  saveKuponsToStorage(allKupons);

  // Update total_scanned counter for booth
  if (boothId || boothNama) {
    const bIndex = allBooths.findIndex(
      (b) =>
        (boothId && b.id === boothId) ||
        (boothId && b.username === boothId) ||
        (boothNama && b.nama_booth === boothNama)
    );
    if (bIndex !== -1) {
      allBooths[bIndex].total_scanned = (allBooths[bIndex].total_scanned || 0) + 1;
      saveBoothsToStorage(allBooths);
    }
  }

  return {
    success: true,
    message: `KUPON VALID! Berhasil ditukar untuk ${kupon.nomor_rumah} di ${boothNama || 'Booth'}.`,
    kupon: updatedKupon,
  };
}

export function scanAndUseKupon(
  kodeKuponInput: string,
  adminName: string
): { success: boolean; message: string; kupon?: KuponAcara } {
  return scanAndUseKuponByBooth(kodeKuponInput, undefined, adminName);
}

// ── Generate Real-Time Booth Report for Event ───────────────
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

// ── Delete Event & Cascading Kupons/Booths ─────────────────
export function deleteEvent(eventId: string): void {
  const events = getEventsFromStorage().filter((e) => e.id !== eventId);
  const kupons = getKuponsFromStorage().filter((k) => k.event_id !== eventId);
  const booths = getBoothsFromStorage().filter((b) => b.event_id !== eventId);

  saveEventsToStorage(events);
  saveKuponsToStorage(kupons);
  saveBoothsToStorage(booths);
}

// ── Delete Single Kupon ─────────────────────────────────────
export function deleteKupon(kuponId: string): void {
  const kupons = getKuponsFromStorage().filter((k) => k.id !== kuponId);
  saveKuponsToStorage(kupons);
}
