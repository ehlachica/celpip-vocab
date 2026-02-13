import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export function createSupabaseClient() {
  const ok =
    (SUPABASE_URL || "").startsWith("https://") &&
    (SUPABASE_URL || "").includes(".supabase.co") &&
    (SUPABASE_ANON_KEY || "").length > 20;

  if (!ok) return null;
  if (!window.supabase?.createClient) return null;

  return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "celpip_vocab_auth",
      storage: window.localStorage,
    },
  });
}
