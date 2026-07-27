// ============================================================
// Root Page — Redirect to appropriate route
// ============================================================

import { redirect } from 'next/navigation';

export default function Home() {
  // Middleware handles the redirect logic based on auth state
  // This is a fallback if middleware doesn't catch it
  redirect('/login');
}
