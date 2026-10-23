import { createClient } from '@supabase/supabase-js';

// Bolt injects VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY at build time.
// These are available in the hosted Bolt environment and the live deployed site.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
