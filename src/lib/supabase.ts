import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error('Failed to initialize Supabase:', error);
  }
} else {
  console.warn('Supabase credentials (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing in environment variables.');
}

/**
 * The Supabase client instance. 
 * Note: This may be null if credentials are not provided.
 */
export const supabase = supabaseInstance;
