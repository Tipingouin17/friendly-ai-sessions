
/**
 * Supabase client shim — re-exports the Railway API client.
 * All imports of `supabase` from this file now use the Railway FastAPI backend.
 * The @supabase/supabase-js package is no longer used.
 */
import api from "@/lib/api";

// Drop-in replacement: `supabase` now points to our Railway API client
export const supabase = api;

// Legacy exports used by paymentService and other files
export const EDGE_FUNCTION_URL = import.meta.env.VITE_API_URL as string;
export const EDGE_FUNCTION_KEY = import.meta.env.VITE_API_ANON_KEY as string;
