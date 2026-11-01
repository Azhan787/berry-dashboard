import { createClient } from '@supabase/supabase-js';

export function publicClient() {
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const error = new Error('Supabase is not configured. Copy server/.env.example to server/.env and add project credentials.');
    error.status = 503;
    throw error;
  }
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function userClient(token) {
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const error = new Error('Supabase is not configured. Copy server/.env.example to server/.env and add project credentials.');
    error.status = 503;
    throw error;
  }
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}
