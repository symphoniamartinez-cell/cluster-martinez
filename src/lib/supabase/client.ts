// ============================================================
// Supabase Browser Client
// Used in Client Components (use client)
// ============================================================

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('your-project') || !url.startsWith('http')) {
    return null;
  }
  return createBrowserClient(url, key);
}
