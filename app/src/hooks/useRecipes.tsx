import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Recipe } from '../lib/types';
import { useAuth } from './useAuth';

const COLUMNS = 'id,user_id,source_url,status,error,attempts,locked_at,title,description,cuisine,category,tags,servings,prep_min,cook_min,total_min,difficulty,ingredients,steps,tips,hero_svg,cover_url,author,favorite,notes,created_at,updated_at';

export type AddResult = { ok: true; id: string; existing: boolean } | { ok: false; error: string };

interface RecipesCtx {
  recipes: Recipe[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  update: (id: string, patch: Partial<Recipe>) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  addUrl: (raw: string) => Promise<AddResult>;
  retry: (id: string) => Promise<boolean>;
}

const Ctx = createContext<RecipesCtx | null>(null);

/** Extracts and canonicalizes an Instagram post/reel URL from arbitrary shared text. */
export function extractInstagramUrl(raw: string): string | null {
  const m = raw.match(/https?:\/\/(?:www\.|m\.)?(?:instagram\.com|instagr\.am)\/[^\s"'<>]+/i);
  if (!m) return null;
  try {
    const u = new URL(m[0]);
    if (!/(^|\.)instagram\.com$|^instagr\.am$/i.test(u.hostname)) return null;
    const path = u.pathname.replace(/\/+$/, '');
    if (!/^\/(?:[\w.]+\/)?(reel|reels|p|tv)\/[\w-]+/i.test(path)) return null;
    return `https://www.instagram.com${path}/`;
  } catch { return null; }
}

export function RecipesProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.from('recipes').select(COLUMNS).order('created_at', { ascending: false });
    if (error) setError(error.message);
    else { setRecipes(data as unknown as Recipe[]); setError(null); }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const channel = supabase
      .channel('recipes-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const id = (payload.old as { id: string }).id;
          setRecipes((rs) => rs.filter((r) => r.id !== id));
        } else {
          const row = payload.new as Recipe;
          setRecipes((rs) => {
            const i = rs.findIndex((r) => r.id === row.id);
            if (i === -1) return [row, ...rs];
            const copy = rs.slice();
            copy[i] = { ...rs[i], ...row };
            return copy;
          });
        }
      })
      .subscribe();
    const onVis = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { void supabase.removeChannel(channel); document.removeEventListener('visibilitychange', onVis); };
  }, [session, refresh]);

  const update = useCallback(async (id: string, patch: Partial<Recipe>) => {
    let prev: Recipe | undefined;
    setRecipes((rs) => rs.map((r) => (r.id === id ? ((prev = r), { ...r, ...patch }) : r)));
    const { error } = await supabase.from('recipes').update(patch).eq('id', id);
    if (error && prev) { const p = prev; setRecipes((rs) => rs.map((r) => (r.id === id ? p : r))); }
    return !error;
  }, []);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (!error) setRecipes((rs) => rs.filter((r) => r.id !== id));
    return !error;
  }, []);

  const addUrl = useCallback(async (raw: string): Promise<AddResult> => {
    const url = extractInstagramUrl(raw.trim());
    if (!url) return { ok: false, error: 'Isto não parece um link de um reel ou publicação do Instagram.' };
    const path = new URL(url).pathname.split('/').filter(Boolean).slice(-1)[0];
    const { data: dupes } = await supabase.from('recipes').select('id,source_url').ilike('source_url', `%${path}%`).limit(5);
    const dupe = (dupes ?? []).find((d) => extractInstagramUrl(d.source_url) === url);
    if (dupe) return { ok: true, id: dupe.id, existing: true };
    const { data, error } = await supabase.from('recipes').insert({ source_url: url }).select(COLUMNS).single();
    if (error || !data) return { ok: false, error: error?.message ?? 'Erro desconhecido' };
    const row = data as unknown as Recipe;
    setRecipes((rs) => (rs.some((r) => r.id === row.id) ? rs : [row, ...rs]));
    return { ok: true, id: row.id, existing: false };
  }, []);

  const retry = useCallback((id: string) => update(id, { status: 'queued', attempts: 0, error: null, locked_at: null }), [update]);

  const value = useMemo(() => ({ recipes, loading, error, refresh, update, remove, addUrl, retry }), [recipes, loading, error, refresh, update, remove, addUrl, retry]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRecipes(): RecipesCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('RecipesProvider em falta');
  return c;
}
