import { createClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client (anon key): public reads and the moderator's
 * Supabase Auth session (persisted, so the login survives reloads).
 */
let cached: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowser() {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  cached = createClient(url, key, {
    auth: { persistSession: true },
  });
  return cached;
}
