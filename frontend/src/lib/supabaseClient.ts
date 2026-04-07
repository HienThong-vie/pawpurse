import { createClient } from "@supabase/supabase-js";

const supabaseURL = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKeys = import.meta.env.VITE_SUPABASE_ANON_KEYS;

const supabase = createClient(supabaseURL, supabaseAnonKeys); //able frontend to communicate to supabase
export default supabase;
