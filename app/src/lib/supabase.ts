import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://vhvhwfwkfdfzjoiqqqok.supabase.co';
const KEY = 'sb_publishable_x-_kXcu3XoDtwA6p04UFyQ_hB10FJIP';

export const supabase = createClient(SUPABASE_URL, KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'receitas-auth' },
});
