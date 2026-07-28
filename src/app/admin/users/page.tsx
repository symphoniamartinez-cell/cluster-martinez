'use client';

// ============================================================
// User Management Page — /admin/users
// Dedicated for Admin Staff Accounts: Superadmin, Pengurus, Bendahara
// (Warga authentication uses Kode Aktivasi from Data Warga menu)
// Super App Cluster Martinez
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import {
  UserCog,
  Plus,
  Search,
  Pencil,
  X,
  Save,
  KeyRound,
  Shield,
  Check,
  Eye,
  EyeOff,
  User,
  Trash2,
  Lock,
  Info,
  Store,
} from 'lucide-react';
import type { UserAccount, UserRole } from '@/types';
import { ROLE_LABELS } from '@/types';
import {
  getAdminUsersFromStorage,
  saveAdminUsersToStorage,
  DEFAULT_PASSWORD,
} from '@/lib/user-store';
import { getBoothsFromStorage, getEventsFromStorage } from '@/lib/event-store';
import type { TenantBooth, EventAcara } from '@/types';

const ROLE_BADGE_COLORS: Record<UserRole, string> = {
  superadmin: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  pengurus: 'bg-primary-500/10 text-primary-600 dark:text-primary-400 border-primary-500/20',
  bendahara: 'bg-success-500/10 text-success-600 dark:text-success-400 border-success-500/20',
  warga: 'bg-surface-200/50 text-surface-700 dark:bg-surface-800 dark:text-surface-300 border-surface-300',
  booth: 'bg-accent-500/10 text-accent-600 dark:text-accent-400 border-accent-500/20',
  penjaga_ch: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
};

export default function UserManagementPage() {
  const [activeUserTab, setActiveUserTab] = useState<'admin' | 'booth'>('admin');
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [booths, setBooths] = useState<TenantBooth[]>([]);
  const [events, setEvents] = useState<EventAcara[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('superadmin');
  const [search, setSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<UserAccount | null>(null);
  const [newPassword, setNewPassword] = useState(DEFAULT_PASSWORD);
  const [showPassToggle, setShowPassToggle] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    nama: '',
    role: 'pengurus' as UserRole,
    password: DEFAULT_PASSWORD,
  });

  const canEdit = currentUserRole === 'superadmin' || currentUserRole === 'pengurus';

  useEffect(() => {
    const stored = sessionStorage.getItem('demo_user');
    if (stored) {
      const u = JSON.parse(stored);
      setCurrentUserRole(u.role);
    }

    setUsers(getAdminUsersFromStorage());
    setBooths(getBoothsFromStorage());
    setEvents(getEventsFromStorage());
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole =
        selectedRoleFilter === 'all' || u.role === selectedRoleFilter;

      if (!search) return matchesRole;

      const q = search.toLowerCase().trim();
      const matchesSearch =
        u.username.toLowerCase().includes(q) ||
        u.nama.toLowerCase().includes(q);

      return matchesRole && matchesSearch;
    });
  }, [users, search, selectedRoleFilter]);

  // ── Open Add Modal ─────────────────────────────────────────
  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      nama: '',
      role: 'pengurus',
      password: DEFAULT_PASSWORD,
    });
    setShowAddEditModal(true);
  };

  // ── Open Edit Modal ────────────────────────────────────────
  const handleOpenEdit = (user: UserAccount) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      nama: user.nama,
      role: user.role,
      password: user.password,
    });
    setShowAddEditModal(true);
  };

  // ── Open Change Password Modal ────────────────────────────
  const handleOpenChangePassword = (user: UserAccount) => {
    setPasswordTarget(user);
    setNewPassword(user.password || DEFAULT_PASSWORD);
    setShowPasswordModal(true);
  };

  // ── Save User (Add / Edit) ────────────────────────────────
  const handleSaveUser = () => {
    if (!formData.username.trim() || !formData.nama.trim()) {
      alert('Username dan Nama Pengguna wajib diisi!');
      return;
    }

    let updatedList: UserAccount[];

    if (editingUser) {
      updatedList = users.map((u) =>
        u.id === editingUser.id
          ? {
              ...u,
              username: formData.username.trim().toUpperCase(),
              nama: formData.nama.trim(),
              role: formData.role,
              password: formData.password || DEFAULT_PASSWORD,
            }
          : u
      );
    } else {
      const newUser: UserAccount = {
        id: `u-adm-${Date.now()}`,
        username: formData.username.trim().toUpperCase(),
        nama: formData.nama.trim(),
        role: formData.role,
        password: formData.password || DEFAULT_PASSWORD,
        created_at: new Date().toISOString(),
      };
      updatedList = [...users, newUser];
    }

    setUsers(updatedList);
    saveAdminUsersToStorage(updatedList);
    setShowAddEditModal(false);
    showToast('Data user pengurus berhasil disimpan!');
  };

  // ── Save Password Change ──────────────────────────────────
  const handleSavePassword = () => {
    if (!passwordTarget) return;
    if (!newPassword.trim()) {
      alert('Password tidak boleh kosong!');
      return;
    }

    const updatedList = users.map((u) =>
      u.id === passwordTarget.id ? { ...u, password: newPassword.trim() } : u
    );

    setUsers(updatedList);
    saveAdminUsersToStorage(updatedList);
    setShowPasswordModal(false);
    showToast(`Password untuk ${passwordTarget.username} berhasil diperbarui!`);
  };

  // ── Delete User ───────────────────────────────────────────
  const handleDeleteUser = (user: UserAccount) => {
    if (confirm(`Yakin ingin menghapus user pengurus ${user.username} (${user.nama})?`)) {
      const updatedList = users.filter((u) => u.id !== user.id);
      setUsers(updatedList);
      saveAdminUsersToStorage(updatedList);
      showToast(`User ${user.username} berhasil dihapus.`);
    }
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* ── Toast Notification ───────────────────────────────── */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-5 py-3.5 bg-surface-900 text-white rounded-2xl shadow-2xl border border-white/10 animate-fade-in text-sm font-medium">
          <Check className="w-4 h-4 text-success-400 flex-shrink-0" />
          {toastMessage}
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/20">
            <UserCog className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl lg:text-2xl font-bold text-surface-900 dark:text-white">
                Manajemen User Admin & Pengurus
              </h1>
              <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-bold">
                {users.length} Akun Pengurus
              </span>
            </div>
            <p className="text-sm text-surface-700/60 dark:text-surface-200/50 mt-0.5">
              Kelola akun & password untuk Superadmin, Pengurus, dan Bendahara (Default: <code className="font-mono text-amber-500">Martinez.2021</code>)
            </p>
          </div>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-semibold rounded-xl shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah User Admin Baru
          </button>
        )}
      </div>

      {/* ── Tab Switcher: Admin Users vs Tenant Booth Accounts ── */}
      <div className="flex bg-white dark:bg-surface-900 p-1 rounded-2xl border border-surface-200 dark:border-surface-800 w-fit">
        <button
          type="button"
          onClick={() => setActiveUserTab('admin')}
          className={`
            flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer
            ${
              activeUserTab === 'admin'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
            }
          `}
        >
          <UserCog className="w-4 h-4" />
          Akun Pengurus & Admin ({users.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveUserTab('booth')}
          className={`
            flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer
            ${
              activeUserTab === 'booth'
                ? 'bg-accent-500 text-white shadow-md shadow-accent-500/20'
                : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
            }
          `}
        >
          <Store className="w-4 h-4" />
          Akun Tenant Event ({booths.length})
        </button>
      </div>

      {/* Info Callout explaining division between Admin Users & Warga */}
      <div className="flex items-start gap-3 p-4 bg-primary-500/10 border border-primary-500/20 rounded-2xl text-xs lg:text-sm text-primary-700 dark:text-primary-300">
        <Info className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
        <div>
          <strong>Informasi Akses Sistem:</strong>
          <p className="mt-0.5 text-xs text-primary-700/80 dark:text-primary-300/80 leading-relaxed">
            Halaman ini khusus mengelola akun <strong>Pengurus, Superadmin, dan Bendahara</strong> (login menggunakan <i>Username & Password</i>). Untuk akun <strong>Warga</strong>, autentikasi menggunakan <strong>Nomor Rumah & Kode Aktivasi</strong> yang dikelola pada menu <a href="/admin/warga" className="underline font-semibold hover:text-primary-500">Data Warga</a>.
          </p>
        </div>
      </div>

      {/* Role notice for bendahara */}
      {!canEdit && (
        <div className="flex items-center gap-3 p-4 bg-warning-400/10 border border-warning-400/20 rounded-xl text-sm text-warning-500 animate-fade-in">
          <Shield className="w-5 h-5 flex-shrink-0" />
          <p>
            <strong>Mode View-Only:</strong> Sebagai Bendahara, Anda hanya dapat melihat data akun pengurus.
          </p>
        </div>
      )}

      {/* ── Search & Filter Bar ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-200/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari username atau nama pengurus..."
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
          />
        </div>

        {/* Role Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
          <button
            onClick={() => setSelectedRoleFilter('all')}
            className={`
              px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer
              ${
                selectedRoleFilter === 'all'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  : 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-100'
              }
            `}
          >
            Semua Admin ({users.length})
          </button>
          {(['superadmin', 'pengurus', 'bendahara'] as UserRole[]).map(
            (r) => (
              <button
                key={r}
                onClick={() => setSelectedRoleFilter(r)}
                className={`
                  px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap
                  ${
                    selectedRoleFilter === r
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                      : 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-100'
                  }
                `}
              >
                {ROLE_LABELS[r]} ({users.filter((u) => u.role === r).length})
              </button>
            )
          )}
        </div>
      </div>

      {/* ── Table: Admin Users vs Tenant Booth Accounts ────────── */}
      {activeUserTab === 'admin' ? (
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-800/30">
                  <th className="px-4 py-3.5 text-left font-semibold text-surface-700 dark:text-surface-200/70">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5" />
                      Username Admin
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-left font-semibold text-surface-700 dark:text-surface-200/70">
                    Nama Pengguna
                  </th>
                  <th className="px-4 py-3.5 text-left font-semibold text-surface-700 dark:text-surface-200/70">
                    Role Akses
                  </th>
                  <th className="px-4 py-3.5 text-left font-semibold text-surface-700 dark:text-surface-200/70">
                    Password Login
                  </th>
                  {canEdit && (
                    <th className="px-4 py-3.5 text-right font-semibold text-surface-700 dark:text-surface-200/70">
                      Aksi
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800/50">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors"
                  >
                    <td className="px-4 py-3.5 font-bold text-surface-900 dark:text-white font-mono">
                      {user.username}
                    </td>

                    <td className="px-4 py-3.5 font-medium text-surface-900 dark:text-white">
                      {user.nama}
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border ${
                          ROLE_BADGE_COLORS[user.role]
                        }`}
                      >
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-xs text-surface-600 dark:text-surface-300">
                      {user.password || DEFAULT_PASSWORD}
                    </td>

                    {canEdit && (
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenChangePassword(user)}
                            className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500 hover:text-amber-500 rounded-lg transition-colors cursor-pointer"
                            title="Ubah Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500 hover:text-primary-500 rounded-lg transition-colors cursor-pointer"
                            title="Edit User"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {user.role !== 'superadmin' && (
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="p-1.5 text-danger-500 hover:bg-danger-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Hapus User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={canEdit ? 5 : 4}
                      className="px-4 py-12 text-center text-surface-700/50 dark:text-surface-200/40"
                    >
                      <UserCog className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>Tidak ada user admin ditemukan.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-surface-50 dark:bg-surface-800/30 border-t border-surface-200 dark:border-surface-800 text-xs text-surface-700/50 dark:text-surface-200/40">
            Menampilkan <strong>{filteredUsers.length}</strong> akun admin
          </div>
        </div>
      ) : (
        /* ── TENANT BOOTH ACCOUNTS TABLE ───────────────────────── */
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-surface-800">
            <div>
              <h3 className="font-bold text-surface-900 dark:text-white text-base">
                Daftar Akun Tenant / Booth Makanan Event
              </h3>
              <p className="text-xs text-surface-500">
                Akun tenant booth hanya berlaku pada Hari-H acara. Password default: <code>event123</code>
              </p>
            </div>
            <a
              href="/admin/events/create"
              className="px-3.5 py-2 bg-accent-500 text-white rounded-xl text-xs font-bold shadow-md hover:bg-accent-600 transition-all"
            >
              + Tambah Event & Booth Baru
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-700 text-surface-500 uppercase tracking-wider font-semibold">
                  <th className="px-4 py-3">Nama Booth Makanan</th>
                  <th className="px-4 py-3">Event Acara</th>
                  <th className="px-4 py-3">Username Login</th>
                  <th className="px-4 py-3">Password</th>
                  <th className="px-4 py-3">Status Akses Hari-H</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {booths.map((b) => {
                  const evt = events.find((e) => e.id === b.event_id);
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isTodayEvent = evt ? evt.tanggal_event === todayStr : false;
                  const isPastEvent = evt ? evt.tanggal_event < todayStr : false;

                  return (
                    <tr key={b.id} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/50">
                      <td className="px-4 py-3 font-bold text-surface-900 dark:text-white flex items-center gap-2">
                        <Store className="w-4 h-4 text-accent-500" />
                        {b.nama_booth}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {evt ? evt.nama_event : 'Event Acara Kluster'}
                        <span className="block text-[10px] text-surface-400 font-mono">
                          {evt ? evt.tanggal_event : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-primary-600 dark:text-primary-400">
                        {b.username}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-surface-900 dark:text-white">
                        {b.password || 'event123'}
                      </td>
                      <td className="px-4 py-3">
                        {isTodayEvent ? (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-success-500/10 text-success-600 dark:text-success-400 border border-success-500/20">
                            🟢 AKTIF (HARI-H SEKARANG)
                          </span>
                        ) : isPastEvent ? (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-danger-500/10 text-danger-500 border border-danger-500/20">
                            🔴 KADALUARSA (HARI-H LEWAT)
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-warning-500/10 text-warning-500 border border-warning-500/20">
                            🟡 BELUM AKUN (BELUM HARI-H)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal Add / Edit User ────────────────────────────── */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAddEditModal(false)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-800 animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-800">
              <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
                {editingUser ? 'Edit User Admin' : 'Tambah User Admin Baru'}
              </h3>
              <button
                onClick={() => setShowAddEditModal(false)}
                className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Username Login
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  placeholder="Contoh: PENGURUS2, BENDAHARA2"
                  className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl text-sm bg-white dark:bg-surface-800 font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Nama Pengguna
                </label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) =>
                    setFormData({ ...formData, nama: e.target.value })
                  }
                  placeholder="Contoh: Budi Santoso (Wakil Pengurus)"
                  className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl text-sm bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Role Akses Admin
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as UserRole,
                    })
                  }
                  className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl text-sm bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all cursor-pointer font-semibold"
                >
                  <option value="pengurus">Pengurus (Kelola Data Warga)</option>
                  <option value="bendahara">Bendahara (Kelola Status Iuran)</option>
                  <option value="penjaga_ch">Penjaga Clubhouse (Akses Kasir Toko)</option>
                  {currentUserRole === 'superadmin' && (
                    <option value="superadmin">Super Admin (Akses Penuh)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Password Login
                </label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Masukkan password admin"
                  className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl text-sm bg-white dark:bg-surface-800 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200 dark:border-surface-800">
              <button
                onClick={() => setShowAddEditModal(false)}
                className="px-4 py-2.5 text-sm font-medium text-surface-700 dark:text-surface-200/70 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveUser}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Change Password ────────────────────────────── */}
      {showPasswordModal && passwordTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPasswordModal(false)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-800 animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-800">
              <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
                Ubah Password Admin
              </h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="p-3 bg-surface-100 dark:bg-surface-800 rounded-xl text-xs space-y-1">
                <p>
                  Username: <strong className="font-mono text-sm text-surface-900 dark:text-white">{passwordTarget.username}</strong>
                </p>
                <p className="text-surface-500">Nama: {passwordTarget.nama}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Password Baru
                </label>
                <div className="relative">
                  <input
                    type={showPassToggle ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan password baru"
                    className="w-full pl-4 pr-10 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl text-sm bg-white dark:bg-surface-800 font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassToggle(!showPassToggle)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-700 cursor-pointer"
                  >
                    {showPassToggle ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200 dark:border-surface-800">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2.5 text-sm font-medium text-surface-700 dark:text-surface-200/70 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSavePassword}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Simpan Password Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
