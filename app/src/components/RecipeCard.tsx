import { Link } from 'react-router-dom';
import type { Recipe } from '../lib/types';
import { formatMinutes, totalMinutes } from '../lib/types';
import Drawing from './Drawing';
import { IconClock, IconHeart } from './Icons';
import type { ReactNode } from 'react';

export function Cover({ recipe, prefer = 'photo' }: { recipe: Recipe; prefer?: 'photo' | 'drawing' }) {
  const showPhoto = recipe.cover_url && (prefer === 'photo' || !recipe.hero_svg);
  if (showPhoto) return <img className="cover-img" src={recipe.cover_url!} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />;
  if (recipe.hero_svg) return <Drawing svg={recipe.hero_svg} animate={false} className="cover-drawing" />;
  return <div className="cover-blank"><span className="hand">{recipe.title?.slice(0, 1) ?? '?'}</span></div>;
}

export default function RecipeCard({ recipe, index = 0, footer }: { recipe: Recipe; index?: number; footer?: ReactNode }) {
  const mins = totalMinutes(recipe);
  return (
    <Link to={`/receita/${recipe.id}`} className="rcard fade-up" style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}>
      <div className="rcard-media">
        <Cover recipe={recipe} />
        {recipe.favorite && <span className="rcard-fav" aria-label="Favorita"><IconHeart /></span>}
        {recipe.category && <span className="rcard-cat">{recipe.category}</span>}
      </div>
      <div className="rcard-body">
        <h3>{recipe.title ?? 'Sem título'}</h3>
        <div className="rcard-meta">
          <span><IconClock /> {formatMinutes(mins)}</span>
          {recipe.difficulty && <span className={`diff d-${recipe.difficulty}`}>{recipe.difficulty}</span>}
        </div>
        {footer}
      </div>
    </Link>
  );
}
