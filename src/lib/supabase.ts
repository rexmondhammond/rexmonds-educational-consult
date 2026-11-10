import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Public project URL and publishable key. These are safe to ship in the browser:
 * every table is protected by row level security, so the key alone grants nothing.
 * Override with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY to point at another project.
 */
const URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || "https://kjnqkhpnxojitvovmidr.supabase.co";
const KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || "sb_publishable_GuXjosPJFO1-55842FDdxQ_4OsKfwfM";

export const backendEnabled = Boolean(URL && KEY);

export const supabase: SupabaseClient = createClient(URL, KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  realtime: { params: { eventsPerSecond: 5 } },
});
