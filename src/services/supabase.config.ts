import { createClient } from '@supabase/supabase-js';

// Supabase replaces Firebase on the `vercel` branch. URL + anon key come from
// env (Vite injects VITE_*-prefixed vars at build time). The anon key is safe
// to ship in the client bundle ONLY when row-level security is enabled on the
// tables — see supabase/schema.sql. Set these in .env.local locally and in the
// Vercel project's Environment Variables for deploys.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill them in.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
