export type Status = 'queued' | 'processing' | 'done' | 'error';

export const CATEGORIES = [
  'Pequeno-almoço', 'Entradas', 'Sopas', 'Pratos principais', 'Massas', 'Saladas',
  'Sobremesas', 'Bolos e doces', 'Pão', 'Bebidas', 'Snacks', 'Molhos',
] as const;

export const DIFFICULTIES = ['Fácil', 'Média', 'Difícil'] as const;

export const AISLES = [
  'Frutas e legumes', 'Padaria', 'Talho e peixaria', 'Laticínios e ovos', 'Mercearia',
  'Especiarias e temperos', 'Congelados', 'Bebidas', 'Outros',
] as const;

export interface Ingredient {
  name: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  group: string | null;
  aisle: string | null;
  optional?: boolean;
}

export interface Step {
  n: number;
  title: string | null;
  text: string;
  duration_min: number | null;
  timer_sec: number | null;
  ingredients: string[];
  svg: string | null;
}

export interface Recipe {
  id: string;
  user_id: string;
  source_url: string;
  status: Status;
  error: string | null;
  attempts: number;
  locked_at: string | null;
  title: string | null;
  description: string | null;
  cuisine: string | null;
  category: string | null;
  tags: string[] | null;
  servings: number | null;
  prep_min: number | null;
  cook_min: number | null;
  total_min: number | null;
  difficulty: string | null;
  ingredients: Ingredient[] | null;
  steps: Step[] | null;
  tips: string[] | null;
  hero_svg: string | null;
  cover_url: string | null;
  author: string | null;
  caption: string | null;
  transcript: string | null;
  favorite: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShoppingItem {
  id: string;
  user_id?: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  aisle: string | null;
  checked: boolean;
  recipe_id: string | null;
  created_at?: string;
}

export function totalMinutes(r: Pick<Recipe, 'total_min' | 'prep_min' | 'cook_min'>): number | null {
  if (r.total_min) return r.total_min;
  const t = (r.prep_min ?? 0) + (r.cook_min ?? 0);
  return t > 0 ? t : null;
}

export function formatMinutes(min: number | null): string {
  if (!min) return '—';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m}` : `${h} h`;
}
