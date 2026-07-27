'use client';

// ============================================================
// PwaRegistrar — Registers Service Worker & Handles PWA Install Prompt
// Super App Cluster Martinez
// ============================================================

import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export default function PwaRegistrar() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker for PWA Offline Caching
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] ServiceWorker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.error('[PWA] ServiceWorker registration failed:', err);
        });
    }

    // 2. Listen for BeforeInstallPrompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] User response to install prompt:', outcome);
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  if (!showInstallBanner) return null;

  return (
    <div className="fixed bottom-5 left-5 right-5 sm:left-auto sm:right-5 sm:max-w-md z-[9999] bg-surface-900 text-white p-4 rounded-2xl shadow-2xl border border-white/10 animate-fade-in flex items-start gap-3">
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex-shrink-0 shadow-lg shadow-primary-500/20">
        <Smartphone className="w-5 h-5 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold tracking-tight">
          Install App Cluster Martinez
        </h4>
        <p className="text-xs text-surface-300 mt-0.5 leading-relaxed">
          Tambahkan ke layar utama HP / Laptop untuk akses instan seperti aplikasi native.
        </p>

        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-primary-500/20 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Install Aplikasi
          </button>
          <button
            onClick={() => setShowInstallBanner(false)}
            className="px-3 py-1.5 text-xs text-surface-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            Nanti Saja
          </button>
        </div>
      </div>

      <button
        onClick={() => setShowInstallBanner(false)}
        className="p-1 text-surface-400 hover:text-white transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
