// ============================================================
// Middleware — Route Protection & Role Guard
// Super App Cluster Martinez
// ============================================================

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { UserRole } from '@/types';

// Routes accessible by each role
const ROLE_ROUTES: Record<UserRole, string[]> = {
  superadmin: ['/admin', '/dashboard', '/booth'],
  pengurus: ['/admin', '/booth'],
  bendahara: ['/admin', '/booth'],
  warga: ['/dashboard'],
  booth: ['/booth'],
};

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ── Demo Mode Support (Fallback when Supabase URL is placeholder or demo_user cookie exists) ──
  const demoCookie = request.cookies.get('demo_user')?.value;
  let demoRole: UserRole | null = null;
  if (demoCookie) {
    try {
      const parsed = JSON.parse(demoCookie);
      demoRole = parsed.role;
    } catch {}
  }

  // If Supabase URL is placeholder, use demo auth mode
  const isDemoEnv =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project');

  const pathname = request.nextUrl.pathname;

  if (isDemoEnv || demoRole) {
    const activeRole = demoRole || 'superadmin';

    if (pathname === '/login' || pathname === '/') {
      if (demoRole) {
        const redirectTo = demoRole === 'warga' ? '/dashboard' : '/admin';
        return NextResponse.redirect(new URL(redirectTo, request.url));
      }
      if (pathname === '/') {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      return supabaseResponse;
    }

    // Protected route check for demo mode
    if (!demoRole) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    const allowed = ROLE_ROUTES[activeRole] || [];
    if (!allowed.some((r) => pathname.startsWith(r))) {
      const defaultRoute = activeRole === 'warga' ? '/dashboard' : '/admin';
      return NextResponse.redirect(new URL(defaultRoute, request.url));
    }

    return supabaseResponse;
  }

  // ── Standard Supabase Auth Flow ─────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Public routes ─────────────────────────────────────────
  if (pathname === '/login' || pathname === '/') {
    if (user) {
      // Already logged in → redirect based on role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = (profile?.role as UserRole) || 'warga';
      const redirectTo = role === 'warga' ? '/dashboard' : '/admin';
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    // If accessing "/" and not logged in, redirect to /login
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return supabaseResponse;
  }

  // ── Protected routes ──────────────────────────────────────
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Fetch user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = (profile?.role as UserRole) || 'warga';

  // Check if the user's role allows access to the current route
  const allowedRoutes = ROLE_ROUTES[role] || [];
  const hasAccess = allowedRoutes.some((route) => pathname.startsWith(route));

  if (!hasAccess) {
    // Redirect to their default route
    const defaultRoute = role === 'warga' ? '/dashboard' : '/admin';
    return NextResponse.redirect(new URL(defaultRoute, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes — handle auth separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
