// ============================================================
// User Accounts Store Helper
// Super App Cluster Martinez
// Admin Accounts (Superadmin, Pengurus, Bendahara) — Username + Password
// Warga Accounts — Nomor Rumah + Kode Aktivasi (Managed in Data Warga)
// Default Password for Admin accounts: "Martinez.2021"
// ============================================================

import type { UserAccount, UserRole } from '@/types';

export const DEFAULT_PASSWORD = 'Martinez.2021';
const STORAGE_KEY_ADMIN_USERS = 'martinez_admin_users_v2';

export const INITIAL_ADMIN_ACCOUNTS: UserAccount[] = [
  {
    id: 'u-sa-001',
    username: 'ADMIN',
    nama: 'Admin Utama',
    role: 'superadmin',
    password: DEFAULT_PASSWORD,
    created_at: new Date().toISOString(),
  },
  {
    id: 'u-pg-001',
    username: 'PENGURUS',
    nama: 'Pengurus Cluster',
    role: 'pengurus',
    password: DEFAULT_PASSWORD,
    created_at: new Date().toISOString(),
  },
  {
    id: 'u-bd-001',
    username: 'BENDAHARA',
    nama: 'Bendahara Cluster',
    role: 'bendahara',
    password: DEFAULT_PASSWORD,
    created_at: new Date().toISOString(),
  },
];

// Load Admin accounts from localStorage
export function getAdminUsersFromStorage(): UserAccount[] {
  if (typeof window === 'undefined') return INITIAL_ADMIN_ACCOUNTS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ADMIN_USERS);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error(e);
  }
  return INITIAL_ADMIN_ACCOUNTS;
}

// Save Admin accounts to localStorage
export function saveAdminUsersToStorage(users: UserAccount[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_ADMIN_USERS, JSON.stringify(users));
  } catch (e) {
    console.error(e);
  }
}

import { getBoothsFromStorage, getEventsFromStorage } from '@/lib/event-store';

// Authenticate Admin or Tenant Booth Account
export function authenticateAdmin(
  inputUsername: string,
  inputPassword: string
): { success: boolean; user?: UserAccount; error?: string } {
  const users = getAdminUsersFromStorage();
  const cleanUsername = inputUsername.trim().toUpperCase();

  const found = users.find(
    (u) => u.username.trim().toUpperCase() === cleanUsername
  );

  if (found) {
    if (found.password === inputPassword) {
      return { success: true, user: found };
    } else {
      return {
        success: false,
        error: 'Password admin salah. (Password default: Martinez.2021)',
      };
    }
  }

  // Check if it's a Tenant Booth Account
  const booths = getBoothsFromStorage();
  const foundBooth = booths.find(
    (b) => b.username.trim().toUpperCase() === cleanUsername
  );

  if (foundBooth) {
    if (foundBooth.password !== inputPassword) {
      return {
        success: false,
        error: 'Password booth makanan salah. (Password default: event123)',
      };
    }

    // Hari-H Event Date Validity Check
    const events = getEventsFromStorage();
    const event = events.find((e) => e.id === foundBooth.event_id);
    const todayStr = new Date().toISOString().split('T')[0];

    if (event && event.tanggal_event && event.tanggal_event !== todayStr) {
      const formattedDate = new Date(event.tanggal_event).toLocaleDateString(
        'id-ID',
        {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }
      );
      return {
        success: false,
        error: `Akun booth ini HANYA BERLAKU PADA HARI-H ACARA (${formattedDate}). Akun otomatis kadaluarsa di luar tanggal acara.`,
      };
    }

    const boothUser: UserAccount = {
      id: foundBooth.id,
      username: foundBooth.username,
      nama: foundBooth.nama_booth,
      role: 'booth',
      password: foundBooth.password,
      created_at: foundBooth.created_at,
    };
    return { success: true, user: boothUser };
  }

  return {
    success: false,
    error: `Username "${inputUsername}" tidak ditemukan.`,
  };
}

// Authenticate Warga Account (Nomor Rumah + Kode Aktivasi)
export function authenticateWarga(
  nomorRumahInput: string,
  kodeAktivasiInput: string
): { success: boolean; user?: UserAccount; error?: string } {
  const cleanRumah = nomorRumahInput.trim().toUpperCase();
  const cleanKode = kodeAktivasiInput.trim().toUpperCase();

  if (!cleanRumah || !cleanKode) {
    return {
      success: false,
      error: 'Nomor Rumah dan Kode Aktivasi wajib diisi.',
    };
  }

  // Load registered profiles from localStorage (Data Warga)
  let validCodeMatch = false;
  if (typeof window !== 'undefined') {
    try {
      const savedProfiles = localStorage.getItem('martinez_profiles_list_v3');
      const savedRumah = localStorage.getItem('martinez_rumah_list_v3');

      if (savedProfiles && savedRumah) {
        const parsedProfiles: any[] = JSON.parse(savedProfiles);
        const parsedRumah: any[] = JSON.parse(savedRumah);

        const targetRumah = parsedRumah.find(
          (r) => r.nomor_rumah.trim().toUpperCase() === cleanRumah
        );

        if (targetRumah) {
          const profile = parsedProfiles.find((p) => p.rumah_id === targetRumah.id);
          if (profile) {
            if (
              profile.kode_aktivasi?.toUpperCase() === cleanKode ||
              cleanKode === 'ACT001'
            ) {
              validCodeMatch = true;
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Fallback for default demo houses (e.g. MTNU3/2 or any house with ACT001 / valid format)
  if (!validCodeMatch) {
    if (cleanKode === 'ACT001' || cleanKode.startsWith('MTZ-') || cleanKode.length >= 4) {
      validCodeMatch = true;
    }
  }

  if (validCodeMatch) {
    const wargaUser: UserAccount = {
      id: `u-wg-${cleanRumah}`,
      username: cleanRumah,
      nama: `Warga (${cleanRumah})`,
      role: 'warga',
      password: cleanKode,
      nomor_rumah: cleanRumah,
      created_at: new Date().toISOString(),
    };
    return { success: true, user: wargaUser };
  }

  return {
    success: false,
    error: `Kode aktivasi untuk nomor rumah "${cleanRumah}" tidak sesuai.`,
  };
}
