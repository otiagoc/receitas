import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { ShoppingItem } from '../lib/types';
import { planAdd, type NewItem } from '../lib/shopping';
import { useAuth } from './useAuth';

interface ShoppingCtx {
  items: ShoppingItem[];
  loading: boolean;
  addItems: (items: NewItem[]) => Promise<boolean>;
  setChecked: (ids: string[], checked: boolean) => Promise<void>;
  updateItem: (id: string, patch: Partial<ShoppingItem>) => Promise<void>;
  removeItems: (ids: string[]) => Promise<void>;
}

const Ctx = createContext<ShoppingCtx | null>(null);
const COLS = 'id,name,quantity,unit,aisle,checked,recipe_id,created_at';

export function ShoppingProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from('shopping_items').select(COLS).order('created_at');
    if (data) setItems(data as ShoppingItem[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!session) { setItems([]); return; }
    void load();
    const ch = supabase
      .channel('shopping-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items' }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [session, load]);

  const addItems = useCallback(async (incoming: NewItem[]) => {
    const { updates, inserts } = planAdd(items, incoming);
    const ops = updates.map((u) => supabase.from('shopping_items').update({ quantity: u.quantity }).eq('id', u.id));
    const results = await Promise.all([
      ...ops,
      inserts.length ? supabase.from('shopping_items').insert(inserts) : Promise.resolve({ error: null }),
    ]);
    await load();
    return results.every((r) => !r.error);
  }, [items, load]);

  const setChecked = useCallback(async (ids: string[], checked: boolean) => {
    setItems((xs) => xs.map((x) => (ids.includes(x.id) ? { ...x, checked } : x)));
    await supabase.from('shopping_items').update({ checked }).in('id', ids);
  }, []);

  const updateItem = useCallback(async (id: string, patch: Partial<ShoppingItem>) => {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    await supabase.from('shopping_items').update(patch).eq('id', id);
  }, []);

  const removeItems = useCallback(async (ids: string[]) => {
    setItems((xs) => xs.filter((x) => !ids.includes(x.id)));
    await supabase.from('shopping_items').delete().in('id', ids);
  }, []);

  const value = useMemo(() => ({ items, loading, addItems, setChecked, updateItem, removeItems }), [items, loading, addItems, setChecked, updateItem, removeItems]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShopping(): ShoppingCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('ShoppingProvider em falta');
  return c;
}
