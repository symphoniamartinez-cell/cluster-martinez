'use client';

// ============================================================
// Admin Data Iuran Page — /admin
// Displays the full Cluster Iuran Matrix Table with Block & RT Filters
// Supports Excel Template Download & Bulk Excel Upload for Payment History
// Input Rights: Superadmin & Bendahara Only
// Super App Cluster Martinez
// ============================================================

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import {
  LayoutDashboard,
  RefreshCw,
  Home,
  ShieldCheck,
  FileSpreadsheet,
  Download,
  Check,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import IuranTable from '@/components/IuranTable';
import { getMockIuranMatrix } from '@/lib/mock-data';
import type { IuranMatrixRow, UserRole, StatusIuran, Rumah } from '@/types';
import { BULAN_LABELS, BULAN_FULL } from '@/types';

const STORAGE_KEY_IURAN = 'martinez_iuran_matrix_v2';
const STORAGE_KEY_RUMAH = 'martinez_rumah_list_v3';

export default function AdminDashboardPage() {
  const [data, setData] = useState<IuranMatrixRow[]>([]);
  const [userRole, setUserRole] = useState<UserRole>('superadmin');
  const [userName, setUserName] = useState('Admin');
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load user session & Iuran matrix from LocalStorage
  const loadIuranData = useCallback(() => {
    setLoading(true);
    const stored = sessionStorage.getItem('demo_user');
    if (stored) {
      const user = JSON.parse(stored);
      setUserRole(user.role);
      setUserName(user.label);
    }

    try {
      const savedIuran = localStorage.getItem(STORAGE_KEY_IURAN);
      if (savedIuran) {
        const matrix: IuranMatrixRow[] = JSON.parse(savedIuran);
        setData(matrix);
      } else {
        const savedRumah = localStorage.getItem(STORAGE_KEY_RUMAH);
        let currentRumahList: Rumah[] = [];
        if (savedRumah) {
          currentRumahList = JSON.parse(savedRumah);
        }

        if (currentRumahList.length > 0) {
          const newMatrix = currentRumahList.map((r, idx) => {
            const bulan: Record<number, StatusIuran> = {};
            for (let m = 1; m <= 12; m++) {
              bulan[m] = (idx + m) % 3 === 0 ? 'belum_lunas' : 'lunas';
            }
            return {
              rumah_id: r.id,
              nomor_rumah: r.nomor_rumah,
              rt: r.rt,
              status_hunian: r.status_hunian,
              bulan,
            };
          });
          setData(newMatrix);
          localStorage.setItem(STORAGE_KEY_IURAN, JSON.stringify(newMatrix));
        } else {
          const defaultMatrix = getMockIuranMatrix(new Date().getFullYear());
          setData(defaultMatrix);
          localStorage.setItem(STORAGE_KEY_IURAN, JSON.stringify(defaultMatrix));
        }
      }
    } catch (e) {
      console.error('Failed to load Iuran data:', e);
      setData(getMockIuranMatrix(new Date().getFullYear()));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadIuranData();
  }, [loadIuranData]);

  // Handle Superadmin / Bendahara toggling payment status
  const handleToggleIuran = useCallback(
    (rumahId: string, bulan: number, tahun: number, newStatus: StatusIuran) => {
      setData((prev) => {
        const updated = prev.map((row) =>
          row.rumah_id === rumahId
            ? {
                ...row,
                bulan: { ...row.bulan, [bulan]: newStatus },
              }
            : row
        );

        try {
          localStorage.setItem(STORAGE_KEY_IURAN, JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        return updated;
      });
    },
    []
  );

  const handleRefresh = () => {
    loadIuranData();
  };

  // ── Download Excel Template for Data Iuran ─────────────────
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        'Nomor Rumah': 'MTNU1/1',
        RT: '01',
        Jan: 'Lunas',
        Feb: 'Lunas',
        Mar: 'Lunas',
        Apr: 'Lunas',
        Mei: 'Lunas',
        Jun: 'Belum',
        Jul: 'Belum',
        Agt: 'Belum',
        Sep: 'Belum',
        Okt: 'Belum',
        Nov: 'Belum',
        Des: 'Belum',
      },
      {
        'Nomor Rumah': 'MTNU2/5',
        RT: '02',
        Jan: 'Lunas',
        Feb: 'Lunas',
        Mar: 'Lunas',
        Apr: 'Lunas',
        Mei: 'Lunas',
        Jun: 'Lunas',
        Jul: 'Belum',
        Agt: 'Belum',
        Sep: 'Belum',
        Okt: 'Belum',
        Nov: 'Belum',
        Des: 'Belum',
      },
      {
        'Nomor Rumah': 'MTNU3/2',
        RT: '03',
        Jan: 'Lunas',
        Feb: 'Lunas',
        Mar: 'Lunas',
        Apr: 'Lunas',
        Mei: 'Lunas',
        Jun: 'Lunas',
        Jul: 'Lunas',
        Agt: 'Belum',
        Sep: 'Belum',
        Okt: 'Belum',
        Nov: 'Belum',
        Des: 'Belum',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Iuran Bulanan');
    XLSX.writeFile(workbook, 'Template_Data_Iuran_Cluster_Martinez.xlsx');
  };

  // ── Excel Upload Handler for Data Iuran ────────────────────
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

        let updatedCount = 0;
        let insertedCount = 0;

        const updatedMatrix = [...data];

        rows.forEach((row, idx) => {
          const nomorRumahRaw =
            row['Nomor Rumah'] || row['Nomor'] || row['rumah'] || row['No Rumah'] || row['No'];
          if (!nomorRumahRaw) return;

          const nomorRumah = nomorRumahRaw.toString().trim();
          if (!nomorRumah) return;

          const rtVal = (row['RT'] || row['rt'] || '01')
            .toString()
            .replace(/^rt\s*/i, '')
            .padStart(2, '0');

          // Parse month status (1..12) from row headers
          const parsedBulan: Record<number, StatusIuran> = {};

          for (let m = 1; m <= 12; m++) {
            const shortLabel = BULAN_LABELS[m]; // e.g. Jan, Feb
            const fullLabel = BULAN_FULL[m];   // e.g. Januari, Februari

            const valRaw =
              row[shortLabel] ??
              row[fullLabel] ??
              row[m.toString()] ??
              row[`Bulan ${m}`] ??
              row[`Bulan_${m}`] ??
              'belum';

            const valStr = valRaw.toString().toLowerCase().trim();

            const isLunas =
              valStr === 'lunas' ||
              valStr === 'l' ||
              valStr === '1' ||
              valStr === 'v' ||
              valStr === 'ya' ||
              valStr === 'yes' ||
              valStr === 'true';

            parsedBulan[m] = isLunas ? 'lunas' : 'belum_lunas';
          }

          const cleanHouseNo = (s: string) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          const targetClean = cleanHouseNo(nomorRumah);

          // Search existing row by normalized nomor_rumah
          const existingIdx = updatedMatrix.findIndex(
            (r) => cleanHouseNo(r.nomor_rumah) === targetClean
          );

          if (existingIdx >= 0) {
            updatedMatrix[existingIdx] = {
              ...updatedMatrix[existingIdx],
              nomor_rumah: nomorRumah,
              rt: rtVal,
              bulan: {
                ...updatedMatrix[existingIdx].bulan,
                ...parsedBulan,
              },
            };
            updatedCount++;
          } else {
            const newRow: IuranMatrixRow = {
              rumah_id: `r-iuran-imp-${Date.now()}-${idx}`,
              nomor_rumah: nomorRumah,
              rt: rtVal,
              status_hunian: 'pemilik',
              bulan: parsedBulan,
            };
            updatedMatrix.push(newRow);
            insertedCount++;
          }
        });

        setData(updatedMatrix);
        try {
          localStorage.setItem(STORAGE_KEY_IURAN, JSON.stringify(updatedMatrix));
        } catch (e) {
          console.error(e);
        }

        showToast(
          `Impor Excel Iuran Berhasil! ${rows.length} baris diproses berdasarkan Nomor Rumah: ${updatedCount} data iuran diperbarui, ${insertedCount} unit baru didaftarkan.`
        );

        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        console.error(err);
        alert('Gagal membaca file Excel/CSV. Pastikan format file sesuai.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // ── Rich Styled Excel Export for Data Iuran (Green LUNAS, Red BELUM) ─
  const handleExportExcel = () => {
    if (!data || data.length === 0) return;

    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `Data_Iuran_Cluster_Martinez_${timestamp}.xls`;

    let tableHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8"/>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Data Iuran Kluster</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          th { background-color: #0284c7; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-size: 11pt; }
          td { border: 1px solid #e2e8f0; padding: 6px; text-align: center; font-size: 10pt; }
          .lunas { background-color: #d1fae5; color: #047857; font-weight: bold; }
          .belum { background-color: #fee2e2; color: #b91c1c; font-weight: bold; }
          .title { font-size: 16pt; font-weight: bold; color: #0f172a; text-align: left; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colSpan="17" class="title">DATA IURAN BULANAN KLUSTER MARTINEZ</td></tr>
          <tr><td colSpan="17" style="text-align: left; color: #64748b;">Tanggal Export: ${new Date().toLocaleDateString('id-ID')} | Total Unit: ${data.length} Rumah</td></tr>
          <tr></tr>
          <tr style="background-color: #0284c7; color: white; font-weight: bold;">
            <th style="background-color: #0284c7; color: white;">No. Rumah</th>
            <th style="background-color: #0284c7; color: white;">RT</th>
            <th style="background-color: #0284c7; color: white;">Status Hunian</th>
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
              .map((m) => `<th style="background-color: #0284c7; color: white;">${BULAN_LABELS[m]}</th>`)
              .join('')}
            <th style="background-color: #0f172a; color: white;">Total Lunas</th>
            <th style="background-color: #0f172a; color: white;">Total Tunggakan</th>
          </tr>
    `;

    data.forEach((row) => {
      let lunasCount = 0;
      let belumCount = 0;

      let monthCells = '';
      for (let m = 1; m <= 12; m++) {
        const isLunas = row.bulan[m] === 'lunas';
        if (isLunas) lunasCount++;
        else belumCount++;

        monthCells += isLunas
          ? `<td class="lunas" style="background-color: #d1fae5; color: #047857; font-weight: bold;">&#10003; LUNAS</td>`
          : `<td class="belum" style="background-color: #fee2e2; color: #b91c1c; font-weight: bold;">&#10007; BELUM</td>`;
      }

      tableHTML += `
        <tr>
          <td style="font-weight: bold; text-align: left; font-family: monospace;">${row.nomor_rumah}</td>
          <td>RT ${row.rt || '01'}</td>
          <td style="text-transform: capitalize;">${row.status_hunian}</td>
          ${monthCells}
          <td style="font-weight: bold; color: #047857; background-color: #ecfdf5;">${lunasCount} Bulan</td>
          <td style="font-weight: bold; color: #b91c1c; background-color: #fef2f2;">${belumCount} Bulan</td>
        </tr>
      `;
    });

    tableHTML += `</table></body></html>`;

    const blob = new Blob([tableHTML], {
      type: 'application/vnd.ms-excel;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Data Iuran berhasil di-export ke Excel dengan warna Lunas (Hijau) & Belum (Merah)!');
  };

  const canEditIuran = userRole === 'superadmin' || userRole === 'bendahara';

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* ── Toast Notification ───────────────────────────────── */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-5 py-3.5 bg-surface-900 text-white rounded-2xl shadow-2xl border border-white/10 animate-fade-in text-sm font-medium">
          <Check className="w-4 h-4 text-success-400 flex-shrink-0" />
          {toastMessage}
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/20">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl lg:text-2xl font-bold text-surface-900 dark:text-white">
                  Data Iuran Kluster
                </h1>
                {canEditIuran ? (
                  <span className="px-2.5 py-0.5 bg-success-500/10 text-success-600 dark:text-success-400 text-xs font-bold rounded-full">
                    Akses Input Active ({userRole === 'superadmin' ? 'Superadmin' : 'Bendahara'})
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-warning-500/10 text-warning-500 text-xs font-bold rounded-full">
                    View Only (Pengurus)
                  </span>
                )}
              </div>
              <p className="text-sm text-surface-700/60 dark:text-surface-200/50">
                Matriks pembayaran iuran bulanan warga — filter Blok (MTNU1/MTNU2/MTNU3/MTNR/MTNS1-6) & RT
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Export Excel Button (Available to all admin roles) */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-success-600 to-success-500 text-white rounded-xl text-xs font-bold shadow-md shadow-success-500/20 hover:from-success-500 hover:to-success-400 transition-all cursor-pointer"
            title="Export Data Iuran ke Excel dengan warna Lunas (Hijau) & Belum (Merah)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel Data Iuran
          </button>

          {canEditIuran && (
            <>
              {/* Download Template Button */}
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs font-semibold text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 shadow-sm transition-all cursor-pointer"
                title="Download template Excel data iuran"
              >
                <Download className="w-4 h-4 text-surface-500" />
                Template Excel
              </button>

              {/* Upload Excel Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white hover:bg-primary-600 rounded-xl text-xs font-semibold shadow-lg shadow-primary-500/25 transition-all cursor-pointer"
                title="Upload file Excel status iuran bulanan"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Upload Excel Bulk
              </button>
            </>
          )}

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50 cursor-pointer text-surface-700 dark:text-surface-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Role notice banner */}
      {!canEditIuran && (
        <div className="flex items-center gap-3 p-4 bg-warning-400/10 border border-warning-400/20 rounded-2xl text-sm text-warning-500 animate-fade-in">
          <ShieldCheck className="w-5 h-5 flex-shrink-0" />
          <p>
            <strong>Mode View-Only:</strong> Sebagai Pengurus, Anda dapat memantau status iuran seluruh rumah, namun penginputan/pengubahan status iuran khusus dilakukan oleh <strong>Superadmin</strong> dan <strong>Bendahara</strong>.
          </p>
        </div>
      )}

      {/* ── Iuran Matrix Table ───────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
            <p className="text-sm text-surface-700/50 dark:text-surface-200/40">
              Memuat data matriks iuran kluster...
            </p>
          </div>
        </div>
      ) : (
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          }
        >
          <IuranTable
            data={data}
            userRole={userRole}
            onToggleIuran={handleToggleIuran}
          />
        </Suspense>
      )}
    </div>
  );
}
