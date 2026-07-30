'use client';

import { useState } from 'react';
import { X, KeyRound, CheckCircle2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { updateAdminPassword } from '@/lib/user-store';

export default function GantiPasswordModal({
  isOpen,
  onClose,
  username,
}: {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password baru tidak cocok.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const res = updateAdminPassword(username, oldPassword, newPassword);
      if (res.success) {
        setSuccess(true);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 2000);
      } else {
        setError(res.error || 'Gagal mengubah password');
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-surface-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up relative">
        <div className="absolute top-4 right-4">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-primary-500/10 rounded-2xl flex items-center justify-center">
              <KeyRound className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-surface-900 dark:text-white">Ganti Password</h2>
              <p className="text-sm text-surface-500">Ubah kata sandi untuk akun <span className="font-bold">{username}</span></p>
            </div>
          </div>

          {success ? (
            <div className="p-6 bg-success-500/10 rounded-2xl flex flex-col items-center justify-center gap-3 animate-fade-in">
              <CheckCircle2 className="w-12 h-12 text-success-500" />
              <p className="font-bold text-success-600 text-center">Password berhasil diubah!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-danger-500/10 border border-danger-500/20 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-danger-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm font-semibold text-danger-600">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-surface-600 dark:text-surface-300 mb-1.5">
                  Password Saat Ini
                </label>
                <div className="relative">
                  <input
                    type={showOld ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                    placeholder="Masukkan password saat ini"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOld(!showOld)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                  >
                    {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-600 dark:text-surface-300 mb-1.5">
                  Password Baru
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                    placeholder="Minimal 6 karakter"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-600 dark:text-surface-300 mb-1.5">
                  Konfirmasi Password Baru
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                    placeholder="Ulangi password baru"
                    minLength={6}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-500/20 transition-all disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
