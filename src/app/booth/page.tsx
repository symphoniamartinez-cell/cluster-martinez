'use client';

// ============================================================
// Tenant Booth Portal Page — /booth
// Dedicated Scanner Interface for Food & Game Booth Operators
// Super App Cluster Martinez
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  QrCode,
  CheckCircle2,
  XCircle,
  LogOut,
  Sparkles,
  Utensils,
  Store,
  Clock,
  History,
  ShieldAlert,
  Search,
} from 'lucide-react';
import type { KuponAcara } from '@/types';
import { scanAndUseKuponByBooth, getKuponsFromStorage } from '@/lib/event-store';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function BoothPortalPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [boothId, setBoothId] = useState<string>('');
  const [boothNama, setBoothNama] = useState<string>('Booth Makanan');
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    kupon?: KuponAcara;
  } | null>(null);

  const [showCamera, setShowCamera] = useState(false);
  const [recentScans, setRecentScans] = useState<KuponAcara[]>([]);
  const [totalScannedCount, setTotalScannedCount] = useState<number>(0);

  const loadBoothScans = async (currentBoothId: string, currentBoothNama: string) => {
    // 1. Load from local first for fast display
    const allKupons = getKuponsFromStorage();
    let myScans = allKupons.filter(
      (k) => k.used_by_booth_id === currentBoothId || k.used_by_booth_nama === currentBoothNama
    );
    setRecentScans(myScans.reverse());
    setTotalScannedCount(myScans.length);

    // 2. Sync from cloud to clean up deleted events
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const client = createClient();
      if (client) {
        const { data } = await client
          .from('kupons')
          .select('*')
          .or(`used_by_booth_id.eq.${currentBoothId},used_by_booth_nama.ilike.${currentBoothNama}`);
        
        if (data) {
          const cloudKupons = data as KuponAcara[];
          // Update local storage: keep local kupons that are NOT belonging to this booth,
          // then add the fresh cloud kupons for this booth.
          const otherKupons = allKupons.filter(
            (k) => k.used_by_booth_id !== currentBoothId && k.used_by_booth_nama !== currentBoothNama
          );
          const newLocal = [...cloudKupons, ...otherKupons];
          if (typeof window !== 'undefined') {
            localStorage.setItem('martinez_kupon_list_v2', JSON.stringify(newLocal));
          }
          
          setRecentScans(cloudKupons.reverse());
          setTotalScannedCount(cloudKupons.length);
        }
      }
    } catch (e) {
      console.error('Failed to sync booth scans:', e);
    }
  };

  useEffect(() => {
    const stored = sessionStorage.getItem('demo_user');
    if (stored) {
      const user = JSON.parse(stored);
      if (user.role !== 'booth' && user.role !== 'superadmin' && user.role !== 'pengurus') {
        router.push('/login');
        return;
      }
      setBoothId(user.id);
      setBoothNama(user.label || 'Tenant Booth');
      loadBoothScans(user.id, user.label || 'Tenant Booth');
    } else {
      router.push('/login');
    }
  }, [router]);

  const processScan = async (code: string) => {
    if (!code.trim()) return;
    const res = await scanAndUseKuponByBooth(code.trim(), boothId, boothNama);
    setScanResult(res);
    setScanInput('');
    loadBoothScans(boothId, boothNama);
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await processScan(scanInput);
    
    // Keep focus on input for fast rapid scanning
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('demo_user');
    document.cookie = 'demo_user=; path=/; max-age=0';
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-surface-900 text-white pb-12 flex flex-col justify-between">
      <div>
        {/* ── Top Header ─────────────────────────────────────── */}
        <header className="bg-surface-900 border-b border-surface-700 px-4 py-3 sticky top-0 z-10 shadow-lg">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/logo.jpg"
                alt="Martinez Logo"
                className="w-10 h-10 rounded-2xl object-contain bg-white p-1 shadow-lg shadow-accent-500/20 border border-white/20"
              />
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight uppercase">
                  {boothNama}
                </h1>
                <p className="text-[11px] text-accent-400 font-medium">
                  Portal QR Scanner Tenant Booth
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 hover:bg-surface-700 rounded-xl transition-colors text-surface-400 hover:text-white"
              title="Keluar"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </header>

        <main className="max-w-md mx-auto px-4 py-3 space-y-3">
          {/* ── METRIC SUMMARY BADGE ────────────────────────────── */}
          <div className="bg-gradient-to-r from-surface-800 to-surface-800/60 p-3 rounded-2xl border border-surface-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-success-500/10 text-success-400 flex items-center justify-center">
                <Utensils className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-[11px] text-surface-400 uppercase font-semibold">
                  Kupon Ditukar Hari Ini
                </p>
                <p className="text-xl font-bold font-mono text-success-400">
                  {totalScannedCount} <span className="text-xs font-normal text-surface-400">Kupon</span>
                </p>
              </div>
            </div>

          </div>

          {/* ── SCANNER INPUT FORM ────────────────────────────── */}
          <div className="bg-surface-800 rounded-3xl p-4 border border-surface-700 shadow-xl space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-surface-700">
              <QrCode className="w-4 h-4 text-accent-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-surface-300">
                Scan QR Code Penukaran Makanan
              </h2>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowCamera(!showCamera)}
                className="w-full py-3 bg-gradient-to-r from-accent-500 to-primary-500 hover:from-accent-600 hover:to-primary-600 text-white font-bold text-sm rounded-2xl shadow-lg shadow-accent-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <QrCode className="w-5 h-5" />
                {showCamera ? 'Tutup Kamera' : 'Scan Kupon'}
              </button>
            </div>
            
            {showCamera && (
              <div className="mt-3 rounded-2xl overflow-hidden shadow-2xl ring-2 ring-accent-500/50">
                <Scanner
                  onScan={(detectedCodes) => {
                    if (detectedCodes.length > 0) {
                      const code = detectedCodes[0].rawValue;
                      if (code) {
                        setShowCamera(false);
                        processScan(code);
                      }
                    }
                  }}
                  onError={(error) => {
                    console.error(error);
                  }}
                  constraints={{ facingMode: 'environment' }}
                />
              </div>
            )}

            <div className="flex items-center gap-3 py-2 opacity-60">
              <hr className="flex-1 border-surface-600"/>
              <span className="text-[10px] font-bold text-surface-400 tracking-widest">ATAU INPUT MANUAL</span>
              <hr className="flex-1 border-surface-600"/>
            </div>

            <form onSubmit={handleScanSubmit} className="space-y-4">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="Ketik Kode QR..."
                  className="w-full pl-4 pr-12 py-3 bg-surface-900 border-2 border-surface-700 focus:border-accent-500/50 rounded-2xl font-mono text-lg font-bold text-white placeholder:text-surface-500 placeholder:text-sm placeholder:font-sans placeholder:normal-case focus:outline-none uppercase tracking-wider transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-surface-700 hover:bg-surface-600 text-white font-bold text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                Verifikasi Manual
              </button>
            </form>
          </div>

          {/* ── SCAN RESULT FEEDBACK BANNER ────────────────────── */}
          {scanResult && (
            <div className="animate-fade-in">
              <div
                className={`p-5 rounded-3xl border flex items-start gap-4 shadow-xl ${
                  scanResult.success
                    ? 'bg-success-500/15 border-success-500/40 text-success-300'
                    : 'bg-danger-500/15 border-danger-500/40 text-danger-300'
                }`}
              >
                {scanResult.success ? (
                  <CheckCircle2 className="w-7 h-7 flex-shrink-0 mt-0.5 text-success-400" />
                ) : (
                  <XCircle className="w-7 h-7 flex-shrink-0 mt-0.5 text-danger-400" />
                )}
                <div className="space-y-1">
                  <h3 className="font-bold text-base">
                    {scanResult.success
                      ? '✅ KUPON VALID — BERHASIL DITUKAR!'
                      : '❌ KUPON TIDAK VALID / SUDAH DIGUNAKAN'}
                  </h3>
                  <p className="text-xs leading-relaxed">{scanResult.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── RECENT BOOTH SCAN HISTORY ─────────────────────── */}
          <div className="bg-surface-800 rounded-3xl p-5 border border-surface-700 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-surface-700">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-surface-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-surface-300">
                  Histori Penukaran Booth Ini
                </h3>
              </div>
              <span className="text-[11px] font-mono text-surface-400">
                {recentScans.length} Transaksi
              </span>
            </div>

            {recentScans.length === 0 ? (
              <p className="text-center py-6 text-xs text-surface-500">
                Belum ada penukaran kupon di booth ini hari ini.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {recentScans.map((scanned) => (
                  <div
                    key={scanned.id}
                    className="p-3 bg-surface-900/60 rounded-2xl border border-surface-700 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-mono font-bold text-primary-400 text-sm">
                        {scanned.nomor_rumah}
                      </p>
                      <p className="font-mono text-[10px] text-surface-400">
                        {scanned.kode_kupon}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 bg-success-500/10 text-success-400 rounded-md text-[10px] font-bold">
                        Ditukar
                      </span>
                      <p className="text-[10px] text-surface-500 mt-0.5">
                        {scanned.used_at
                          ? new Date(scanned.used_at).toLocaleTimeString('id-ID')
                          : '-'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <footer className="text-center text-[11px] text-surface-500 py-4">
        Super App Cluster Martinez — Event Tenant Booth Portal
      </footer>
    </div>
  );
}
