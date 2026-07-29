// ============================================================
// User Accounts Store Helper
// Super App Cluster Martinez
// Admin Accounts (Superadmin, Pengurus, Bendahara) — Username + Password
// Warga Accounts — Nomor Rumah + Kode Aktivasi (Managed in Data Warga)
// Default Password for Admin accounts: "Martinez.2021"
// ============================================================

import type { UserAccount, UserRole } from '@/types';
import { syncAdminUsersToCloud } from '@/lib/db-sync';

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
  {
    id: 'u-toko-001',
    username: 'TOKOMARTINEZ',
    nama: 'Toko Martinez (Penjaga)',
    role: 'penjaga_ch',
    password: 'Toko.123',
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
    syncAdminUsersToCloud(users);
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
        error: 'Password admin salah.',
      };
    }
  }

  return {
    success: false,
    error: 'Username admin tidak terdaftar.',
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
      error: 'Nomor Rumah dan Password Warga wajib diisi.',
    };
  }

  // Prevent Admin/Pengurus/Bendahara accounts from logging in via Portal Warga
  const adminUsers = getAdminUsersFromStorage();
  const isAdminMatch = adminUsers.some(
    (u) => u.username.trim().toUpperCase() === cleanRumah
  );

  if (isAdminMatch) {
    return {
      success: false,
      error: `Akun Pengurus/Admin "${cleanRumah}" tidak dapat login di Portal Warga. Silakan klik tab "Login Admin / Pengurus".`,
    };
  }

  // Load registered profiles from localStorage (Data Warga)
  let validCodeMatch = false;
  let foundName = '';
  if (typeof window !== 'undefined') {
    try {
      const savedProfiles = localStorage.getItem('martinez_profiles_list_v3');
      const savedRumah = localStorage.getItem('martinez_rumah_list_v3');

      if (savedProfiles && savedRumah) {
        const parsedProfiles: any[] = JSON.parse(savedProfiles);
        const parsedRumah: any[] = JSON.parse(savedRumah);

        const cleanNo = (s: string) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const targetClean = cleanNo(cleanRumah);

        const targetRumah = parsedRumah.find(
          (r) => cleanNo(r.nomor_rumah) === targetClean
        );

        if (targetRumah) {
          const profile = parsedProfiles.find((p) => p.rumah_id === targetRumah.id);
          if (profile) {
            if (
              profile.kode_aktivasi?.toUpperCase() === cleanKode ||
              cleanKode === 'ACT001'
            ) {
              validCodeMatch = true;
              if (profile.nama && profile.nama !== 'Belum ada nama') {
                foundName = profile.nama;
              }
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Fallback for default demo houses
  if (!validCodeMatch) {
    if (cleanKode === 'ACT001' || cleanKode.startsWith('MTZ-') || cleanKode.length >= 4) {
      validCodeMatch = true;
    }
  }

  if (validCodeMatch) {
    const wargaUser: UserAccount = {
      id: `u-wg-${cleanRumah}`,
      username: cleanRumah,
      nama: foundName || `Penghuni ${cleanRumah}`,
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
