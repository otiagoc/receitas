import { Link } from 'react-router-dom';
import type { Recipe } from '../lib/types';
import { CATEGORIES, formatMinutes, totalMinutes } from '../lib/types';
import { Cover } from './RecipeCard';
import { IconRight, IconClock } from './Icons';

function Featured({ recipe }: { recipe: Recipe }) {
  const mins = totalMinutes(recipe);
  return (
    <Link to={`/receita/${recipe.id}`} className="mag-feature">
      <div className="mag-feature-media"><Cover recipe={recipe} /></div>
      <div className="mag-feature-text">
        <span className="mag-feature-kicker">Nova receita</span>
        <h2>{recipe.title}</h2>
        <span className="mag-feature-meta">
          {mins ? <><IconClock /> {formatMinutes(mins)}</> : null}
          {recipe.category ? <span>{recipe.category}</span> : null}
        </span>
      </div>
    </Link>
  );
}

function Tile({ recipe }: { recipe: Recipe }) {
  const mins = totalMinutes(recipe);
  return (
    <Link to={`/receita/${recipe.id}`} className="mag-tile">
      <div className="mag-tile-media"><Cover recipe={recipe} /></div>
      <h3>{recipe.title}</h3>
      {mins ? <span className="mag-tile-meta">{formatMinutes(mins)}{recipe.difficulty ? `, ${recipe.difficulty.toLowerCase()}` : ''}</span> : null}
    </Link>
  );
}

function Row({ title, items, onMore }: { title: string; items: Recipe[]; onMore?: () => void }) {
  if (!items.length) return null;
  return (
    <section className="mag-row">
      <header>
        <h2>{title}</h2>
        {onMore && items.length > 2 && (
          <button className="mag-more" onClick={onMore} aria-label={`Ver todas: ${title}`}>Ver todas <IconRight /></button>
        )}
      </header>
      <div className="mag-scroller">
        {items.map((r) => <Tile key={r.id} recipe={r} />)}
      </div>
    </section>
  );
}

interface Props {
  recipes: Recipe[];                       // done recipes, newest first
  onCategory: (c: string) => void;
  onFavorites: () => void;
  onQuick: () => void;
}

export default function Magazine({ recipes, onCategory, onFavorites, onQuick }: Props) {
  const [first, ...rest] = recipes;
  const favorites = recipes.filter((r) => r.favorite);
  const quick = recipes.filter((r) => { const m = totalMinutes(r); return !!m && m <= 30; });
  const cats = CATEGORIES
    .map((c) => ({ c, items: recipes.filter((r) => r.category === c) }))
    .filter((x) => x.items.length)
    .sort((a, b) => b.items.length - a.items.length);

  return (
    <div className="magazine">
      {first && <Featured recipe={first} />}
      {rest.length > 0 && <Row title="Recentes" items={rest.slice(0, 10)} />}
      <Row title="Favoritas" items={favorites} onMore={onFavorites} />
      <Row title="Prontas em 30 minutos" items={quick} onMore={onQuick} />
      {cats.map(({ c, items }) => <Row key={c} title={c} items={items} onMore={() => onCategory(c)} />)}
    </div>
  );
}
