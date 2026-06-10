import { createClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client (anon key) for reading public lists directly
 * from client components.
 */
let cached: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowser() {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  cached = createClient(url, key, {
    auth: { persistSession: false },
  });
  return cached;
}
