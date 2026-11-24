// Supabase access as the logged-in user (RLS restricts to their rows).
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { config, log } from './util.js';

export const supabase = createClient(config.supabaseUrl, config.supabaseKey, {
  auth: { autoRefreshToken: true, persistSession: false, detectSessionInUrl: false },
});

let userId = null;

export async function login() {
  if (!config.email || !config.password) throw new Error('RECEITAS_EMAIL/RECEITAS_PASSWORD em falta no ficheiro de credenciais');
  const { data, error } = await supabase.auth.signInWithPassword({ email: config.email, password: config.password });
  if (error) throw new Error(`login Supabase falhou: ${error.message}`);
  userId = data.user.id;
  supabase.realtime.setAuth(data.session.access_token);
  log.info('sessão Supabase iniciada');
  return userId;
}

/** Make sure we have a valid session (re-login if the refresh token died). */
export async function ensureSession() {
  const { data } = await supabase.auth.getSession();
  const s = data.session;
  if (!s || (s.expires_at && s.expires_at * 1000 < Date.now() + 60_000)) {
    const r = s ? await supabase.auth.refreshSession() : { error: true };
    if (r.error || !r.data?.session) await login();
  }
  return userId;
}

supabase.auth.onAuthStateChange((event, session) => {
  if (session?.access_token) supabase.realtime.setAuth(session.access_token);
  if (event === 'TOKEN_REFRESHED') log.info('token Supabase renovado');
});

export const getUserId = () => userId;

export async function claimNext() {
  await ensureSession();
  const { data, error } = await supabase.rpc('claim_next_recipe');
  if (error) throw new Error(`claim_next_recipe: ${error.message}`);
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  return rows[0] && rows[0].id ? rows[0] : null;
}

export async function getRecipe(id) {
  await ensureSession();
  const { data, error } = await supabase.from('recipes').select('*').eq('id', id).single();
  if (error) throw new Error(`ler receita ${id}: ${error.message}`);
  return data;
}

export async function updateRecipe(id, patch) {
  await ensureSession();
  const { error } = await supabase.from('recipes').update(patch).eq('id', id);
  if (error) throw new Error(`atualizar receita ${id}: ${error.message}`);
}

export async function insertRecipe(sourceUrl) {
  await ensureSession();
  const { data, error } = await supabase.from('recipes')
    .insert({ user_id: userId, source_url: sourceUrl, status: 'processing', attempts: 1, locked_at: new Date().toISOString() })
    .select('*').single();
  if (error) throw new Error(`inserir receita: ${error.message}`);
  return data;
}

export async function uploadCover(recipeId, file) {
  await ensureSession();
  const bucket = supabase.storage.from('covers');
  const body = fs.readFileSync(file);
  const opts = { contentType: 'image/jpeg', cacheControl: '3600' };
  let path = `${userId}/${recipeId}.jpg`;
  // Overwriting (upsert) needs a SELECT policy on storage.objects; plain insert does not.
  let { error } = await bucket.upload(path, body, { ...opts, upsert: true });
  if (error) {
    ({ error } = await bucket.upload(path, body, { ...opts, upsert: false }));
    if (error && /exists/i.test(error.message)) {
      // Can't overwrite the existing object: use a versioned name instead.
      path = `${userId}/${recipeId}-${Date.now()}.jpg`;
      ({ error } = await bucket.upload(path, body, { ...opts, upsert: false }));
    }
  }
  if (error) throw new Error(`upload capa: ${error.message}`);
  const { data } = bucket.getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

/** Subscribe to inserts on recipes; calls onWake for queued rows. */
export function subscribe(onWake) {
  const channel = supabase.channel('recipes-worker')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'recipes' }, (p) => {
      if (p.new?.status === 'queued') onWake('realtime insert');
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'recipes' }, (p) => {
      if (p.new?.status === 'queued') onWake('realtime requeue');
    })
    .subscribe((status, err) => {
      log.info(`realtime: ${status}${err ? ` (${err.message})` : ''}`);
    });
  return channel;
}
