'use client';

// ============================================================
// Admin Layout — Sidebar + Main Content Area
// Super App Cluster Martinez
// ============================================================

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  TableProperties,
  Users,
  LogOut,
  Menu,
  X,
  Building2,
  ChevronRight,
  Shield,
  UserCog,
  Settings,
  Ticket,
} from 'lucide-react';
import type { UserRole } from '@/types';
import { ROLE_LABELS } from '@/types';

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Data Warga',
    href: '/admin/warga',
    icon: Users,
  },
  {
    label: 'Data Iuran',
    href: '/admin',
    icon: TableProperties,
  },
  {
    label: 'Manajemen User',
    href: '/admin/users',
    icon: UserCog,
  },
  {
    label: 'Acara & Kupon',
    href: '/admin/events',
    icon: Ticket,
  },
  {
    label: 'Pengaturan',
    href: '/admin/settings',
    icon: Settings,
  },
];

const ROLE_COLORS: Record<UserRole, string> = {
  superadmin: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
  pengurus: 'bg-gradient-to-r from-primary-500 to-primary-600 text-white',
  bendahara: 'bg-gradient-to-r from-success-500 to-success-600 text-white',
  warga: 'bg-gradient-to-r from-surface-700 to-surface-800 text-white',
  booth: 'bg-gradient-to-r from-accent-500 to-primary-500 text-white',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('superadmin');
  const [userName, setUserName] = useState('Admin');

  useEffect(() => {
    // Read demo session
    const stored = sessionStorage.getItem('demo_user');
    if (stored) {
      const user = JSON.parse(stored);
      setUserRole(user.role);
      setUserName(user.label);
    }
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('demo_user');
    document.cookie = 'demo_user=; path=/; max-age=0';
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-surface-50 dark:bg-surface-950">
      {/* ── Sidebar Overlay (mobile) ─────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 bg-surface-900 text-white
          flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 shadow-lg shadow-primary-500/20">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight">Cluster Martinez</h2>
            <p className="text-xs text-surface-200/50">Admin Panel</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden ml-auto p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.filter((item) => {
            if (userRole === 'bendahara' && item.href === '/admin/users') {
              return false;
            }
            return true;
          }).map((item) => {
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);

            return (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  router.push(item.href);
                  setSidebarOpen(false);
                }}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                  transition-all duration-200 group
                  ${
                    isActive
                      ? 'bg-primary-500/15 text-primary-400 shadow-sm'
                      : 'text-surface-200/60 hover:bg-white/5 hover:text-white'
                  }
                `}
              >
                <item.icon
                  className={`w-5 h-5 flex-shrink-0 ${
                    isActive ? 'text-primary-400' : 'text-surface-200/40 group-hover:text-white'
                  }`}
                />
                {item.label}
                {isActive && (
                  <ChevronRight className="w-4 h-4 ml-auto text-primary-400" />
                )}
              </a>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10">
              <Shield className="w-4 h-4 text-surface-200/70" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <span
                className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${ROLE_COLORS[userRole]}`}
              >
                {ROLE_LABELS[userRole]}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-surface-200/60 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-white/10 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-surface-100 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary-500" />
            <span className="font-semibold text-sm">Cluster Martinez</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
