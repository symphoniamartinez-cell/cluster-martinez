'use client';

// ============================================================
// Admin Data Warga Page — /admin/warga
// Manage resident profiles, activation codes, RT, Excel import with UPSERT & Pagination
// Super App Cluster Martinez
// ============================================================

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  Search,
  Pencil,
  X,
  Save,
  Key,
  Home,
  Phone,
  UserCircle,
  Shield,
  Copy,
  Check,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  Loader2,
  RefreshCw,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  UploadCloud,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Profile, UserRole, Rumah, StatusHunian, IuranMatrixRow, StatusIuran } from '@/types';
import { syncProfilesToCloud, fetchProfilesFromCloud, syncIuranMatrixToCloud } from '@/lib/db-sync';
import { ROLE_LABELS } from '@/types';

const STORAGE_KEY_RUMAH = 'martinez_rumah_list_v3';
const STORAGE_KEY_PROFILES = 'martinez_profiles_list_v3';

export default function AdminWargaPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [rumahList, setRumahList] = useState<Rumah[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('superadmin');
  const [search, setSearch] = useState('');
  const [selectedRtFilter, setSelectedRtFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── Pagination State ───────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25); // 25 rows per page default

  // ── Confirmation Modal State with 5s Countdown ────────────
  const [confirmTarget, setConfirmTarget] = useState<Profile | null>(null);
  const [countdown, setCountdown] = useState(5);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    nama: 'Belum ada nama',
    rumah_id: '',
    rt: '01',
    phone: '-',
    status_hunian: 'pemilik' as StatusHunian,
    role: 'warga' as UserRole,
    tanggal_masuk: new Date().toISOString().split('T')[0],
  });

  const canEdit = userRole === 'superadmin' || userRole === 'pengurus';

  // ── Initial Load & LocalStorage Persistence ────────────────
  useEffect(() => {
    const storedUser = sessionStorage.getItem('demo_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserRole(user.role);
    }

    try {
      const savedRumah = localStorage.getItem(STORAGE_KEY_RUMAH);
      const savedProfiles = localStorage.getItem(STORAGE_KEY_PROFILES);

      if (savedRumah && savedProfiles) {
        const parsedRumah: Rumah[] = JSON.parse(savedRumah);
        const parsedProfiles: Profile[] = JSON.parse(savedProfiles);

        setRumahList(parsedRumah);
        setProfiles(
          parsedProfiles.map((p) => ({
            ...p,
            rumah: parsedRumah.find((r) => r.id === p.rumah_id),
          }))
        );
      }

      // Fetch from Supabase Cloud Database if connected
      fetchProfilesFromCloud().then((cloudRes) => {
        if (cloudRes) {
          setRumahList(cloudRes.rumahList);
          setProfiles(cloudRes.profiles);
        }
      });
    } catch (e) {
      console.error(e);
      setRumahList([]);
      setProfiles([]);
    }
    setIsLoaded(true);
  }, []);

  // ── Save to LocalStorage whenever state updates ────────────
  const saveStateToStorage = (updatedRumah: Rumah[], updatedProfiles: Profile[]) => {
    try {
      localStorage.setItem(STORAGE_KEY_RUMAH, JSON.stringify(updatedRumah));
      const cleanProfiles = updatedProfiles.map(({ rumah, ...rest }) => rest);
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(cleanProfiles));
      syncProfilesToCloud(updatedProfiles, updatedRumah);
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
    }
  };

  // ── Reset Data Handler ─────────────────────────────────────
  const handleResetData = () => {
    if (profiles.length === 0) {
      alert('Belum ada data rumah terdaftar. Silakan unggah file Excel data kluster Anda.');
      return;
    }

    if (
      confirm(
        `Reset data penghuni? Seluruh ${rumahList.length} Nomor Rumah & RT akan TETAP UTUH (tidak dihapus). Yang di-reset hanya Nama Warga ("Belum ada nama"), Status Hunian ("Pemilik"), dan Telepon ("-").`
      )
    ) {
      const resetRumahList = rumahList.map((r) => ({
        ...r,
        status_hunian: 'pemilik' as StatusHunian,
      }));

      const resetProfilesList = profiles.map((p) => ({
        ...p,
        nama: 'Belum ada nama',
        phone: '-',
        rumah: resetRumahList.find((r) => r.id === p.rumah_id),
      }));

      setRumahList(resetRumahList);
      setProfiles(resetProfilesList);
      saveStateToStorage(resetRumahList, resetProfilesList);

      showToast(
        `Data penghuni di-reset! Seluruh ${resetRumahList.length} Nomor Rumah & RT tetap utuh.`
      );
    }
  };

  // ── Clear All Data (Kosongkan Semua Data Master) ───────────
  const handleClearAllData = () => {
    if (confirm('Hapus seluruh data master rumah & warga untuk mengunggah template Excel baru?')) {
      localStorage.removeItem(STORAGE_KEY_RUMAH);
      localStorage.removeItem(STORAGE_KEY_PROFILES);
      setRumahList([]);
      setProfiles([]);
      showToast('Semua data master berhasil dikosongkan. Siap mengunggah template baru!');
    }
  };

  // ── 5 Second Countdown Timer Effect ────────────────────────
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (confirmTarget && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [confirmTarget, countdown]);

  // Extract list of unique RTs for filtering
  const rtOptions = useMemo(() => {
    const set = new Set<string>();
    rumahList.forEach((r) => {
      if (r.rt) set.add(r.rt);
    });
    return Array.from(set).sort();
  }, [rumahList]);

  // Filtered dataset across search and RT filter
  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      const rtMatch =
        selectedRtFilter === 'all' || p.rumah?.rt === selectedRtFilter;

      if (!search) return rtMatch;

      const q = search.toLowerCase().trim();
      const textMatch =
        p.nama.toLowerCase().includes(q) ||
        p.rumah?.nomor_rumah.toLowerCase().includes(q) ||
        p.rumah?.rt.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q);

      return rtMatch && textMatch;
    });
  }, [profiles, search, selectedRtFilter]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedRtFilter, pageSize]);

  // Paginated dataset
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedProfiles = useMemo(() => {
    if (pageSize === 0) return filtered; // 0 = show all
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const generateKode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'MTZ-';
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  // Bulk format all existing activation codes to MTZ-XXXXX
  const handleBulkFormatKode = () => {
    if (!canEdit) return;
    if (confirm('Format ulang seluruh kode aktivasi warga ke format resmi MTZ-XXXXX?')) {
      const updatedProfiles = profiles.map((p) => ({
        ...p,
        kode_aktivasi: generateKode(),
      }));
      setProfiles(updatedProfiles);
      saveStateToStorage(rumahList, updatedProfiles);
      showToast('☁️ Seluruh kode aktivasi berhasil diformat ke MTZ-XXXXX & tersimpan di Cloud Supabase!');
    }
  };

  // ── Open Regenerate Confirmation Modal ───────────────────
  const openRegenerateModal = (profile: Profile) => {
    if (!canEdit) return;
    setConfirmTarget(profile);
    setCountdown(5);
  };

  // ── Execute Code Regeneration ────────────────────────────
  const handleConfirmRegenerate = () => {
    if (!confirmTarget) return;
    const newCode = generateKode();

    const updatedProfiles = profiles.map((p) =>
      p.id === confirmTarget.id ? { ...p, kode_aktivasi: newCode } : p
    );

    setProfiles(updatedProfiles);
    saveStateToStorage(rumahList, updatedProfiles);

    showToast(
      `Kode aktivasi untuk ${confirmTarget.rumah?.nomor_rumah || confirmTarget.nama} (RT ${confirmTarget.rumah?.rt || '01'}) diperbarui: ${newCode}`
    );
    setConfirmTarget(null);
  };

  const handleEdit = (profile: Profile) => {
    if (!canEdit) return;
    setEditingId(profile.id);
    setFormData({
      nama: profile.nama,
      rumah_id: profile.rumah_id || '',
      rt: profile.rumah?.rt || '01',
      phone: profile.phone || '-',
      status_hunian: profile.rumah?.status_hunian || 'pemilik',
      role: profile.role,
      tanggal_masuk: profile.tanggal_masuk || profile.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    });
    setShowForm(true);
  };

  const handleSave = () => {
    let updatedRumah = [...rumahList];
    if (formData.rumah_id) {
      updatedRumah = updatedRumah.map((r) =>
        r.id === formData.rumah_id
          ? { ...r, status_hunian: formData.status_hunian, rt: formData.rt }
          : r
      );
      setRumahList(updatedRumah);
    }

    const updatedProfiles = profiles.map((p) =>
      p.id === editingId
        ? {
            ...p,
            nama: formData.nama,
            rumah_id: formData.rumah_id,
            phone: formData.phone,
            role: formData.role,
            tanggal_masuk: formData.tanggal_masuk,
            rumah: {
              id: formData.rumah_id,
              nomor_rumah:
                updatedRumah.find((r) => r.id === formData.rumah_id)
                  ?.nomor_rumah || '',
              rt: formData.rt,
              status_hunian: formData.status_hunian,
              created_at: '',
            },
          }
        : p
    );

    setProfiles(updatedProfiles);
    saveStateToStorage(updatedRumah, updatedProfiles);

    setShowForm(false);
    setEditingId(null);
    showToast('Data warga & Tanggal Masuk berhasil disimpan ke Cloud Supabase!');
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // ── Excel Template Download ────────────────────────────────
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        'Nomor Rumah': 'MTNU1/1',
        RT: '01',
        'Status Hunian': 'Pemilik',
        'Nama Warga': 'Ryan Fibrian',
        'No Telepon': '081234567890',
        'Tanggal Masuk': '2026-01-01',
      },
      {
        'Nomor Rumah': 'MTNU2/5',
        RT: '02',
        'Status Hunian': 'Pemilik',
        'Nama Warga': 'Budi Santoso',
        'No Telepon': '081987654321',
        'Tanggal Masuk': '2026-03-15',
      },
      {
        'Nomor Rumah': 'MTNR/11',
        RT: '03',
        'Status Hunian': 'Penyewa',
        'Nama Warga': 'Ahmad Fauzan',
        'No Telepon': '081311223344',
        'Tanggal Masuk': '2026-05-10',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Warga');
    XLSX.writeFile(workbook, 'Template_Master_Warga_Cluster_Martinez.xlsx');
  };

  // ── Bulk UPSERT Excel Upload Handler ───────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

        if (!rows || rows.length === 0) {
          alert('File Excel/CSV kosong atau format header tidak sesuai!');
          return;
        }

        let insertedCount = 0;
        let updatedCount = 0;

        const cleanHouseNo = (s: string) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const updatedRumahList = [...rumahList];
        const updatedProfilesList = [...profiles];

        rows.forEach((row, idx) => {
          const nomorRumahRaw =
            row['Nomor Rumah'] || row['Nomor'] || row['rumah'] || row['No Rumah'] || row['No'];
          if (!nomorRumahRaw) return;

          const nomorRumah = nomorRumahRaw.toString().trim();
          if (!nomorRumah) return;

          // Flexible RT Header Resolution (matches RT, Wilayah RT, No RT, RT/RW, RT 01, etc.)
          let rtVal = '01';
          for (const key of Object.keys(row)) {
            const kClean = key.trim().toLowerCase();
            if (
              kClean === 'rt' ||
              kClean === 'wilayah rt' ||
              kClean === 'no rt' ||
              kClean === 'nomor rt' ||
              kClean === 'rt/rw' ||
              kClean.startsWith('rt')
            ) {
              const rawVal = row[key]?.toString() || '';
              const numOnly = rawVal.replace(/[^0-9]/g, '');
              if (numOnly) {
                rtVal = numOnly.padStart(2, '0');
                break;
              }
            }
          }

          const rawStatus = (
            row['Status Hunian'] ||
            row['Status'] ||
            'pemilik'
          )
            .toString()
            .toLowerCase();

          const status: StatusHunian =
            rawStatus.includes('sewa') || rawStatus.includes('penyewa')
              ? 'penyewa'
              : 'pemilik';

          const nama = row['Nama Warga'] || row['Nama'] || 'Belum ada nama';
          const phone = row['No Telepon'] || row['Telepon'] || row['HP'] || '-';
          const tglMasukRaw = row['Tanggal Masuk'] || row['Tgl Masuk'] || row['Tanggal'] || row['Tgl'];
          const tanggalMasuk = tglMasukRaw ? tglMasukRaw.toString().trim() : '';

          // Search for existing Rumah by nomor_rumah
          let existingRumahIdx = updatedRumahList.findIndex(
            (r) => cleanHouseNo(r.nomor_rumah) === cleanHouseNo(nomorRumah)
          );

          let targetRumahId: string;

          if (existingRumahIdx >= 0) {
            updatedRumahList[existingRumahIdx] = {
              ...updatedRumahList[existingRumahIdx],
              rt: rtVal,
              status_hunian: status,
            };
            targetRumahId = updatedRumahList[existingRumahIdx].id;
          } else {
            targetRumahId = `r-${cleanHouseNo(nomorRumah)}`;
            const newRumah: Rumah = {
              id: targetRumahId,
              nomor_rumah: nomorRumah,
              rt: rtVal,
              status_hunian: status,
              created_at: new Date().toISOString(),
            };
            updatedRumahList.push(newRumah);
          }

          // Search for existing Profile by rumah_id or nomor_rumah
          const existingProfileIdx = updatedProfilesList.findIndex(
            (p) => p.rumah_id === targetRumahId || cleanHouseNo((p as any).nomor_rumah || '') === cleanHouseNo(nomorRumah)
          );

          if (existingProfileIdx >= 0) {
            const currentCode = updatedProfilesList[existingProfileIdx].kode_aktivasi;
            const validCode = (currentCode && currentCode.startsWith('MTZ-')) ? currentCode : generateKode();

            updatedProfilesList[existingProfileIdx] = {
              ...updatedProfilesList[existingProfileIdx],
              nama: nama !== 'Belum ada nama' ? nama : updatedProfilesList[existingProfileIdx].nama,
              phone: phone !== '-' ? phone : updatedProfilesList[existingProfileIdx].phone,
              kode_aktivasi: validCode,
              tanggal_masuk: tanggalMasuk || updatedProfilesList[existingProfileIdx].tanggal_masuk,
              rumah: updatedRumahList.find((r) => r.id === targetRumahId),
            };
            updatedCount++;
          } else {
            const newProfile: Profile = {
              id: `p-${cleanHouseNo(nomorRumah)}`,
              nama,
              rumah_id: targetRumahId,
              role: 'warga',
              kode_aktivasi: generateKode(),
              phone,
              tanggal_masuk: tanggalMasuk || new Date().toISOString().split('T')[0],
              created_at: new Date().toISOString(),
              rumah: updatedRumahList.find((r) => r.id === targetRumahId),
            };
            updatedProfilesList.push(newProfile);
            insertedCount++;
          }
        });

        setRumahList(updatedRumahList);
        setProfiles(updatedProfilesList);

        saveStateToStorage(updatedRumahList, updatedProfilesList);

        // Auto pre-populate Iuran Matrix for all uploaded houses with default 'belum_lunas'
        try {
          const savedIuran = localStorage.getItem('martinez_iuran_matrix_v2');
          let currentMatrix: IuranMatrixRow[] = [];
          if (savedIuran) {
            currentMatrix = JSON.parse(savedIuran);
          }

          const newMatrix = [...currentMatrix];
          const cleanNo = (s: string) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

          updatedRumahList.forEach((r) => {
            const targetClean = cleanNo(r.nomor_rumah);
            const exists = newMatrix.some((m) => cleanNo(m.nomor_rumah) === targetClean);
            if (!exists) {
              const defaultBulan: Record<number, StatusIuran> = {};
              for (let m = 1; m <= 12; m++) {
                defaultBulan[m] = 'belum_lunas';
              }
              newMatrix.push({
                rumah_id: r.id,
                nomor_rumah: r.nomor_rumah,
                rt: r.rt,
                status_hunian: r.status_hunian,
                bulan: defaultBulan,
              });
            }
          });

          syncIuranMatrixToCloud(newMatrix);
        } catch (e) {}

        syncProfilesToCloud(updatedProfilesList, updatedRumahList).then((res) => {
          if (res.success) {
            showToast(
              `☁️ Sukses! ${rows.length} data warga & rumah berhasil diunggah ke Cloud Database Supabase (Lintas Perangkat/Browser Active)!`
            );
          } else {
            showToast(
              `⚠️ Data warga tersimpan lokal. (Catatan Supabase: ${res.error})`
            );
          }
        });

        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        console.error(err);
        alert('Gagal membaca file Excel/CSV. Pastikan format file sesuai.');
      }
    };
    reader.readAsBinaryString(file);
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1300px] mx-auto">
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
          <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 shadow-lg shadow-accent-500/20">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl lg:text-2xl font-bold text-surface-900 dark:text-white">
                Data Warga & Rumah
              </h1>
              <span className="px-2.5 py-0.5 bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-full text-xs font-bold">
                {profiles.length} Total Unit
              </span>
            </div>
            <p className="text-sm text-surface-700/60 dark:text-surface-200/50 mt-0.5">
              Update data penghuni massal via Excel (Nomor Rumah sebagai kode unik)
            </p>
          </div>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Template Download Button */}
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs font-semibold text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 shadow-sm transition-all cursor-pointer"
              title="Download contoh format Excel"
            >
              <Download className="w-4 h-4 text-surface-500" />
              Template Excel
            </button>

            {/* Excel Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-success-500 text-white hover:bg-success-600 rounded-xl text-xs font-semibold shadow-lg shadow-success-500/25 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Upload & Update via Excel
            </button>
          </div>
        )}
      </div>

      {/* Role notice for bendahara */}
      {!canEdit && (
        <div className="flex items-center gap-3 p-4 bg-warning-400/10 border border-warning-400/20 rounded-xl text-sm text-warning-500 animate-fade-in">
          <Shield className="w-5 h-5 flex-shrink-0" />
          <p>
            <strong>Mode View-Only:</strong> Sebagai Bendahara, Anda hanya dapat
            melihat data warga. Hubungi Pengurus atau Superadmin untuk mengubah
            data.
          </p>
        </div>
      )}

      {/* ── Empty State Callout when no houses exist ────────────── */}
      {profiles.length === 0 ? (
        <div className="bg-white dark:bg-surface-900 rounded-3xl border-2 border-dashed border-surface-200 dark:border-surface-800 p-12 text-center shadow-sm animate-fade-in my-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-primary-500/10 text-primary-500 mb-4">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-surface-900 dark:text-white mb-2">
            Belum Ada Data Rumah Terdaftar
          </h2>
          <p className="text-sm text-surface-700/60 dark:text-surface-200/50 max-w-md mx-auto mb-6">
            Unggah file Excel/CSV data kluster Anda untuk membuat master data Nomor Rumah, RT, dan Pemilik secara otomatis.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold text-sm rounded-xl shadow-lg shadow-primary-500/25 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-5 h-5" />
              Upload File Excel / CSV
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-200 font-semibold text-sm rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-surface-500" />
              Download Template
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ── Search & RT Filter Bar ─────────────────────────────── */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-200/50" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nomor rumah (contoh: MTNU3/2), nama, RT..."
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              />
            </div>

            {/* RT Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
              <button
                onClick={() => setSelectedRtFilter('all')}
                className={`
                  px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer
                  ${
                    selectedRtFilter === 'all'
                      ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                      : 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-100'
                  }
                `}
              >
                Semua RT ({rumahList.length})
              </button>
              {rtOptions.map((rt) => {
                const countPerRt = rumahList.filter((r) => r.rt === rt).length;
                return (
                  <button
                    key={rt}
                    onClick={() => setSelectedRtFilter(rt)}
                    className={`
                      px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap
                      ${
                        selectedRtFilter === rt
                          ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                          : 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-100'
                      }
                    `}
                  >
                    RT {rt} ({countPerRt})
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Table ─────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-800/30">
                    <th className="px-4 py-3.5 text-left font-semibold text-surface-700 dark:text-surface-200/70">
                      <div className="flex items-center gap-2">
                        <Home className="w-3.5 h-3.5 text-primary-500" />
                        No. Rumah
                      </div>
                    </th>
                    <th className="px-4 py-3.5 text-left font-semibold text-surface-700 dark:text-surface-200/70">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-accent-500" />
                        RT
                      </div>
                    </th>
                    <th className="px-4 py-3.5 text-left font-semibold text-surface-700 dark:text-surface-200/70">
                      Status Hunian
                    </th>
                    <th className="px-4 py-3.5 text-left font-semibold text-surface-700 dark:text-surface-200/70">
                      <div className="flex items-center gap-2">
                        <UserCircle className="w-3.5 h-3.5" />
                        Nama Warga
                      </div>
                    </th>
                    <th className="px-4 py-3.5 text-left font-semibold text-surface-700 dark:text-surface-200/70">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5" />
                        Telepon
                      </div>
                    </th>
                    <th className="px-4 py-3.5 text-left font-semibold text-surface-700 dark:text-surface-200/70">
                      Tgl. Masuk
                    </th>
                    <th className="px-4 py-3.5 text-left font-semibold text-surface-700 dark:text-surface-200/70">
                      <div className="flex items-center gap-2">
                        <Key className="w-3.5 h-3.5 text-primary-500" />
                        Password Warga
                      </div>
                    </th>
                    {canEdit && (
                      <th className="px-4 py-3.5 text-right font-semibold text-surface-700 dark:text-surface-200/70">
                        Aksi
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800/50">
                  {paginatedProfiles.map((profile) => {
                    const statusHunian = profile.rumah?.status_hunian || 'pemilik';
                    const rt = profile.rumah?.rt || '01';
                    const tglMasuk = profile.tanggal_masuk || profile.created_at?.split('T')[0] || '-';

                    return (
                      <tr
                        key={profile.id}
                        className="hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors"
                      >
                        {/* Nomor Rumah */}
                        <td className="px-4 py-3.5 font-bold text-surface-900 dark:text-white">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-500/10 rounded-lg text-primary-600 dark:text-primary-400 font-bold font-mono text-xs">
                            <Home className="w-3 h-3" />
                            {profile.rumah?.nomor_rumah || '-'}
                          </span>
                        </td>

                        {/* RT Badge */}
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-100 dark:bg-surface-800 rounded-md text-xs font-mono font-bold text-surface-700 dark:text-surface-200">
                            RT {rt}
                          </span>
                        </td>

                        {/* Status Hunian Badge */}
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider ${
                              statusHunian === 'pemilik'
                                ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                                : 'bg-accent-500/10 text-accent-600 dark:text-accent-400'
                            }`}
                          >
                            {statusHunian === 'pemilik' ? 'Pemilik' : 'Penyewa'}
                          </span>
                        </td>

                        {/* Nama Warga */}
                        <td className="px-4 py-3.5 font-medium text-surface-900 dark:text-white">
                          {profile.nama === 'Belum ada nama' ? (
                            <span className="italic text-surface-700/40 dark:text-surface-200/40">
                              Belum ada nama
                            </span>
                          ) : (
                            profile.nama
                          )}
                        </td>

                        {/* Phone */}
                        <td className="px-4 py-3.5 text-surface-700/70 dark:text-surface-200/50 font-mono text-xs">
                          {profile.phone || '-'}
                        </td>

                        {/* Tanggal Masuk */}
                        <td className="px-4 py-3.5 text-surface-700/70 dark:text-surface-200/50 font-mono text-xs">
                          {tglMasuk}
                        </td>

                        {/* Kode Aktivasi with Copy & Regenerate */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            {profile.kode_aktivasi ? (
                              <button
                                onClick={() =>
                                  handleCopyCode(profile.kode_aktivasi!)
                                }
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-100 dark:bg-surface-800 rounded-lg text-xs font-mono hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors cursor-pointer"
                                title="Klik untuk copy"
                              >
                                {profile.kode_aktivasi}
                                {copiedCode === profile.kode_aktivasi ? (
                                  <Check className="w-3 h-3 text-success-500" />
                                ) : (
                                  <Copy className="w-3 h-3 text-surface-200/50" />
                                )}
                              </button>
                            ) : (
                              <span className="text-surface-200/50">-</span>
                            )}

                            {canEdit && (
                              <button
                                onClick={() => openRegenerateModal(profile)}
                                className="p-1 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-surface-400 hover:text-primary-500 transition-colors cursor-pointer"
                                title="Generate ulang kode aktivasi (dengan konfirmasi 5s)"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        {canEdit && (
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => handleEdit(profile)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Edit
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={canEdit ? 7 : 6}
                        className="px-4 py-12 text-center text-surface-700/50 dark:text-surface-200/40"
                      >
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p>Tidak ada data warga ditemukan.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Table Footer & Pagination Bar ─────────────────────── */}
            <div className="px-4 py-3 bg-surface-50 dark:bg-surface-800/30 border-t border-surface-200 dark:border-surface-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-surface-700/60 dark:text-surface-200/50">
              <div>
                Menampilkan{' '}
                <strong>
                  {filtered.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
                </strong>{' '}
                -{' '}
                <strong>
                  {pageSize === 0
                    ? filtered.length
                    : Math.min(currentPage * pageSize, filtered.length)}
                </strong>{' '}
                dari <strong>{filtered.length}</strong> unit
                {filtered.length !== profiles.length && (
                  <span className="ml-1 text-surface-400">
                    (filter dari total {profiles.length})
                  </span>
                )}
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center gap-3">
                {/* Page Size Selector */}
                <div className="flex items-center gap-1.5">
                  <span>Baris:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="px-2 py-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg font-medium cursor-pointer"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={0}>Semua ({filtered.length})</option>
                  </select>
                </div>

                {/* Navigation Buttons */}
                {pageSize > 0 && totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="p-1 hover:bg-surface-200 dark:hover:bg-surface-700 rounded disabled:opacity-30 cursor-pointer"
                      title="Halaman Pertama"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-1 hover:bg-surface-200 dark:hover:bg-surface-700 rounded disabled:opacity-30 cursor-pointer"
                      title="Halaman Sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-2 font-mono font-semibold">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(p + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      className="p-1 hover:bg-surface-200 dark:hover:bg-surface-700 rounded disabled:opacity-30 cursor-pointer"
                      title="Halaman Berikutnya"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-1 hover:bg-surface-200 dark:hover:bg-surface-700 rounded disabled:opacity-30 cursor-pointer"
                      title="Halaman Terakhir"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── 5 Second Confirmation Modal for Regenerate Kode ─── */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmTarget(null)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-800 animate-fade-in overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-warning-500 to-danger-500" />
            <div className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-warning-500/10 text-warning-500 mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-2">
                Generate Ulang Kode Aktivasi?
              </h3>

              <p className="text-sm text-surface-700/70 dark:text-surface-200/60 mb-4">
                Yakin ingin membuat kode aktivasi baru untuk rumah{' '}
                <strong className="text-surface-900 dark:text-white font-mono">
                  {confirmTarget.rumah?.nomor_rumah || confirmTarget.nama} (RT{' '}
                  {confirmTarget.rumah?.rt || '01'})
                </strong>
                ? Kode aktivasi lama akan <strong>segera kedaluwarsa</strong>.
              </p>

              {/* Countdown badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-100 dark:bg-surface-800 rounded-xl text-xs font-mono font-bold text-warning-600 dark:text-warning-400 mb-6">
                <ClockIcon className="w-3.5 h-3.5" />
                {countdown > 0 ? (
                  <span>Tombol konfirmasi aktif dalam {countdown}s</span>
                ) : (
                  <span>Siap untuk di-generate</span>
                )}
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setConfirmTarget(null)}
                  className="flex-1 py-2.5 px-4 text-sm font-medium text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  onClick={handleConfirmRegenerate}
                  disabled={countdown > 0}
                  className={`
                    flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-xl transition-all cursor-pointer
                    ${
                      countdown > 0
                        ? 'bg-surface-200 dark:bg-surface-800 text-surface-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-warning-500 to-amber-500 text-white shadow-lg shadow-warning-500/25 hover:from-warning-600 hover:to-amber-600 active:scale-95'
                    }
                  `}
                >
                  {countdown > 0 ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Tunggu ({countdown}s)
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Ya, Generate Kode Baru
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ───────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          <div className="relative w-full max-w-lg bg-white dark:bg-surface-900 rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-800 animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-800">
              <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
                Edit Data Rumah & Warga
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Nama Warga
                </label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) =>
                    setFormData({ ...formData, nama: e.target.value })
                  }
                  placeholder="Masukkan nama warga"
                  className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl text-sm bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Nomor Rumah
                  </label>
                  <input
                    type="text"
                    value={
                      rumahList.find((r) => r.id === formData.rumah_id)
                        ?.nomor_rumah || ''
                    }
                    disabled
                    className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl text-sm bg-surface-100 dark:bg-surface-800 font-mono font-bold text-surface-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Wilayah RT
                  </label>
                  <select
                    value={formData.rt}
                    onChange={(e) =>
                      setFormData({ ...formData, rt: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl text-sm bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all cursor-pointer font-mono font-bold text-primary-600 dark:text-primary-400"
                  >
                    <option value="01">RT 01</option>
                    <option value="02">RT 02</option>
                    <option value="03">RT 03</option>
                    <option value="04">RT 04</option>
                    <option value="05">RT 05</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Status Hunian
                  </label>
                  <select
                    value={formData.status_hunian}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status_hunian: e.target.value as StatusHunian,
                      })
                    }
                    className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl text-sm bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all cursor-pointer font-semibold"
                  >
                    <option value="pemilik">Pemilik</option>
                    <option value="penyewa">Penyewa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  No. Telepon / HP
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="08xxxxxxxxxx"
                  className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl text-sm bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-surface-900 dark:text-white">
                  Tanggal Masuk Penghuni
                </label>
                <input
                  type="date"
                  value={formData.tanggal_masuk}
                  onChange={(e) =>
                    setFormData({ ...formData, tanggal_masuk: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl text-sm bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all font-mono font-bold text-primary-600 dark:text-primary-400"
                />
                <p className="text-[11px] text-surface-700/50 dark:text-surface-200/40 mt-1">
                  Tanggal masuk menentukan bulan awal kewajiban iuran & perhitungan persentase kelayakan kupon acara.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200 dark:border-surface-800">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 text-sm font-medium text-surface-700 dark:text-surface-200/70 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white text-sm font-medium rounded-xl shadow-lg shadow-primary-500/25 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
