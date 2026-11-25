import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRecipes } from '../hooks/useRecipes';
import { CATEGORIES, DIFFICULTIES, totalMinutes, type Recipe } from '../lib/types';
import { stripAccents } from '../lib/ingredients';
import RecipeCard from '../components/RecipeCard';
import Magazine from '../components/Magazine';
import PendingCard from '../components/PendingCard';
import SketchLoader from '../components/SketchLoader';
import { IconHeart, IconPlus, IconSearch, IconSliders, IconX } from '../components/Icons';
import { Logo } from '../components/Layout';

type Sort = 'recent' | 'fast' | 'az';
interface Filters { q: string; cat: string | null; fav: boolean; maxMin: number | null; diff: string | null; sort: Sort }
const DEFAULT: Filters = { q: '', cat: null, fav: false, maxMin: null, diff: null, sort: 'recent' };

function loadFilters(): Filters {
  try { return { ...DEFAULT, ...JSON.parse(sessionStorage.getItem('home-filters') || '{}') }; } catch { return DEFAULT; }
}

const norm = (s: string) => stripAccents(s.toLowerCase());

function haystack(r: Recipe): string {
  return norm([r.title, r.description, r.category, r.cuisine, r.author, ...(r.tags ?? []), ...(r.ingredients ?? []).map((i) => i.name)].filter(Boolean).join(' '));
}

export default function Home() {
  const { recipes, loading, error } = useRecipes();
  const [f, setF] = useState<Filters>(loadFilters);
  const [showFilters, setShowFilters] = useState(false);
  useEffect(() => { try { sessionStorage.setItem('home-filters', JSON.stringify(f)); } catch { /* ignore */ } }, [f]);
  const set = (p: Partial<Filters>) => setF((x) => ({ ...x, ...p }));

  const pending = recipes.filter((r) => r.status !== 'done');
  const done = useMemo(() => recipes.filter((r) => r.status === 'done'), [recipes]);
  const cats = useMemo(() => CATEGORIES.filter((c) => done.some((r) => r.category === c)), [done]);

  const list = useMemo(() => {
    const words = norm(f.q).split(/\s+/).filter(Boolean);
    const out = done.filter((r) => {
      if (f.cat && r.category !== f.cat) return false;
      if (f.fav && !r.favorite) return false;
      if (f.diff && r.difficulty !== f.diff) return false;
      if (f.maxMin) { const m = totalMinutes(r); if (!m || m > f.maxMin) return false; }
      if (words.length) { const h = haystack(r); if (!words.every((w) => h.includes(w))) return false; }
      return true;
    });
    if (f.sort === 'fast') out.sort((a, b) => (totalMinutes(a) ?? 9999) - (totalMinutes(b) ?? 9999));
    else if (f.sort === 'az') out.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? '', 'pt'));
    return out;
  }, [done, f]);

  const activeFilters = Number(f.fav) + Number(!!f.maxMin) + Number(!!f.diff) + Number(f.sort !== 'recent');
  const browsing = !f.q.trim() && !f.cat && activeFilters === 0;

  return (
    <div className="home">
      <header className="home-head">
        <div className="mobile-only"><Logo /></div>
        <div className="desk-only">
          <h1>Receitas</h1>
        </div>
        <Link to="/add" className="btn accent small mobile-only" aria-label="Adicionar receita"><IconPlus /> Adicionar</Link>
      </header>

      <div className="searchbar">
        <IconSearch />
        <input type="search" placeholder="Procurar receitas, ingredientes…" value={f.q} onChange={(e) => set({ q: e.target.value })} aria-label="Procurar" />
        {f.q && <button className="icon-btn plain" onClick={() => set({ q: '' })} aria-label="Limpar"><IconX /></button>}
        <button className={`icon-btn ${activeFilters ? 'has-filters' : ''}`} onClick={() => setShowFilters((s) => !s)} aria-label="Filtros" aria-expanded={showFilters}>
          <IconSliders />{activeFilters > 0 && <em className="badge">{activeFilters}</em>}
        </button>
      </div>

      {showFilters && (
        <div className="filters card fade-up">
          <div className="filter-row">
            <span className="eyebrow">Mostrar</span>
            <div className="chips wrap">
              <button className={`chip ${f.fav ? 'on' : ''}`} onClick={() => set({ fav: !f.fav })}><IconHeart /> Favoritos</button>
            </div>
          </div>
          <div className="filter-row">
            <span className="eyebrow">Tempo</span>
            <div className="chips wrap">
              {[15, 30, 60].map((m) => (
                <button key={m} className={`chip ${f.maxMin === m ? 'on' : ''}`} onClick={() => set({ maxMin: f.maxMin === m ? null : m })}>≤ {m} min</button>
              ))}
            </div>
          </div>
          <div className="filter-row">
            <span className="eyebrow">Dificuldade</span>
            <div className="chips wrap">
              {DIFFICULTIES.map((d) => (
                <button key={d} className={`chip ${f.diff === d ? 'on' : ''}`} onClick={() => set({ diff: f.diff === d ? null : d })}>{d}</button>
              ))}
            </div>
          </div>
          <div className="filter-row">
            <span className="eyebrow">Ordenar</span>
            <div className="seg">
              {([['recent', 'Recentes'], ['fast', 'Mais rápidas'], ['az', 'A–Z']] as [Sort, string][]).map(([k, l]) => (
                <button key={k} className={f.sort === k ? 'on' : ''} onClick={() => set({ sort: k })}>{l}</button>
              ))}
            </div>
          </div>
          {activeFilters > 0 && <button className="btn ghost small" onClick={() => set({ fav: false, maxMin: null, diff: null, sort: 'recent' })}>Limpar filtros</button>}
        </div>
      )}

      {cats.length > 1 && !browsing && (
        <div className="chips cat-chips">
          <button className={`chip ${!f.cat ? 'on' : ''}`} onClick={() => set({ cat: null })}>Todas</button>
          {cats.map((c) => (
            <button key={c} className={`chip ${f.cat === c ? 'on' : ''}`} onClick={() => set({ cat: f.cat === c ? null : c })}>{c}</button>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <section className="pending-list">
          {pending.map((r) => <PendingCard key={r.id} recipe={r} />)}
        </section>
      )}

      {error && <p className="form-error">Erro a carregar: {error}</p>}

      {loading ? (
        <div className="empty"><SketchLoader /><p>A abrir o caderno…</p></div>
      ) : done.length === 0 ? (
        <div className="empty">
          <SketchLoader size={160} />
          <h3>O caderno ainda está em branco</h3>
          <p>Partilha um reel de receita do Instagram para aqui (ou cola o link) e eu desenho-a para ti.</p>
          <Link to="/add" className="btn accent"><IconPlus /> Adicionar a primeira</Link>
        </div>
      ) : list.length === 0 ? (
        <div className="empty"><h3>Nada encontrado</h3><p>Experimenta outra pesquisa ou limpa os filtros.</p></div>
      ) : browsing ? (
        <Magazine
          recipes={done}
          onCategory={(c) => { set({ cat: c }); window.scrollTo({ top: 0 }); }}
          onFavorites={() => { set({ fav: true }); window.scrollTo({ top: 0 }); }}
          onQuick={() => { set({ maxMin: 30 }); window.scrollTo({ top: 0 }); }}
        />
      ) : (
        <>
          <p className="count muted">{list.length} {list.length === 1 ? 'receita' : 'receitas'}</p>
          <div className="grid">
            {list.map((r, i) => <RecipeCard key={r.id} recipe={r} index={i} />)}
          </div>
        </>
      )}
    </div>
  );
}
