import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

/**
 * Creates a single Supabase client instance (or returns null if config missing).
 * NOTE: The Supabase JS library is loaded in index.html via CDN and exposes window.supabase.
 * We intentionally avoid declaring a variable named `supabase` to prevent "already been declared".
 */
export function createSupabaseClient() {
  const ok = (SUPABASE_URL || "").startsWith("https://") && (SUPABASE_URL || "").includes(".supabase.co") && (SUPABASE_ANON_KEY || "").length > 20;
  if (!ok) return null;
  if (!window.supabase?.createClient) return null;
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
