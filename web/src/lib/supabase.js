/**
 * Supabase client singleton — import this everywhere, never re-instantiate.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase = null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[CB-MOPA] Missing Supabase env vars. Copy .env.example → .env.local and fill in your keys.'
  );
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };
