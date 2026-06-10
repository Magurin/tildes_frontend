import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client for use inside Route Handlers only.
 *
 * Prefers the service-role key when present; falls back to the anon key
 * (works for the MVP because RLS is disabled). Never import this in client
 * components — the service key must not reach the browser.
 */
export function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase env missing: set NEXT_PUBLIC_SUPABASE_URL and a key.",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
