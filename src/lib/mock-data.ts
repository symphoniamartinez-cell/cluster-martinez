// ============================================================
// Mock Data — For development and demo purposes
// Replace with Supabase queries in production
// ============================================================

import type {
  IuranMatrixRow,
  StatusIuran,
  UserSession,
  KuponAcara,
  Profile,
  Rumah,
} from '@/types';

// -----------------------------------------------------------
// Mock Users
// -----------------------------------------------------------

export const MOCK_USERS: Record<string, UserSession> = {
  superadmin: {
    id: 'sa-001',
    nama: 'Admin Utama',
    role: 'superadmin',
    rumah_id: null,
    nomor_rumah: null,
  },
  pengurus: {
    id: 'pg-001',
    nama: 'Budi Santoso',
    role: 'pengurus',
    rumah_id: null,
    nomor_rumah: null,
  },
  bendahara: {
    id: 'bd-001',
    nama: 'Siti Rahayu',
    role: 'bendahara',
    rumah_id: null,
    nomor_rumah: null,
  },
  warga: {
    id: 'wg-001',
    nama: 'Ahmad Fauzan',
    role: 'warga',
    rumah_id: 'r-001',
    nomor_rumah: 'MTNU3/2',
  },
};

// Initial dataset starts empty (populated via Excel Upload template)
export const MOCK_RUMAH: Rumah[] = [];
export const MOCK_PROFILES: Profile[] = [];

// -----------------------------------------------------------
// Mock Iuran Matrix (for a given year)
// -----------------------------------------------------------

function randomStatus(): StatusIuran {
  return Math.random() > 0.3 ? 'lunas' : 'belum_lunas';
}

export function getMockIuranMatrix(tahun: number): IuranMatrixRow[] {
  const currentMonth = new Date().getMonth() + 1; // 1-12

  return MOCK_RUMAH.map((rumah) => {
    const bulan: Record<number, StatusIuran> = {};
    for (let m = 1; m <= 12; m++) {
      if (tahun === new Date().getFullYear() && m > currentMonth) {
        bulan[m] = 'belum_lunas';
      } else if (rumah.status_hunian === 'kosong') {
        bulan[m] = 'belum_lunas';
      } else {
        bulan[m] = randomStatus();
      }
    }
    return {
      rumah_id: rumah.id,
      nomor_rumah: rumah.nomor_rumah,
      rt: rumah.rt,
      status_hunian: rumah.status_hunian,
      bulan,
    };
  });
}

// -----------------------------------------------------------
// Mock Iuran for a single Warga
// -----------------------------------------------------------

export function getMockWargaIuran(
  rumahId: string,
  tahun: number
): Record<number, StatusIuran> {
  const bulan: Record<number, StatusIuran> = {};
  const currentMonth = new Date().getMonth() + 1;

  for (let m = 1; m <= 12; m++) {
    if (tahun === new Date().getFullYear() && m > currentMonth) {
      bulan[m] = 'belum_lunas';
    } else {
      // Deterministic based on rumahId for consistency
      const hash = rumahId.charCodeAt(rumahId.length - 1) + m;
      bulan[m] = hash % 3 === 0 ? 'belum_lunas' : 'lunas';
    }
  }
  return bulan;
}

// -----------------------------------------------------------
// Mock Kupon
// -----------------------------------------------------------

export function getMockKupon(wargaId: string, tahun: number): KuponAcara[] {
  const iuran = getMockWargaIuran('r-001', tahun);
  const totalLunas = Object.values(iuran).filter((s) => s === 'lunas').length;

  const kupons: KuponAcara[] = [];
  for (let i = 0; i < totalLunas; i++) {
    kupons.push({
      id: `kp-${wargaId}-${tahun}-${i + 1}`,
      event_id: 'evt-001',
      nama_event: 'Doorprize HUT RI Kluster Martinez',
      nama_kupon: 'Kupon Doorprize Utama',
      warga_id: wargaId,
      nomor_rumah: 'MTNU3/2',
      tahun,
      kode_kupon: `MTZ-${tahun}-${String(i + 1).padStart(3, '0')}-${wargaId.slice(-3).toUpperCase()}`,
      is_used: i < 2, // first 2 used for demo
      used_at: i < 2 ? '2026-07-15T10:00:00Z' : null,
      created_at: '',
    });
  }
  return kupons;
}
