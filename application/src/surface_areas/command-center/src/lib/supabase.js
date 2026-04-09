import { createClient } from '@supabase/supabase-js';
// Get the environment variables that we store in .env.local
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase environment variables are missing! Check your .env.local file.");
}
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
//# sourceMappingURL=supabase.js.map