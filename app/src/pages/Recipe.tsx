import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useRecipes } from '../hooks/useRecipes';
import { useToast } from '../hooks/useToast';
import { useChecklist, useServings } from '../hooks/useRecipeState';
import { formatMinutes, totalMinutes } from '../lib/types';
import Drawing from '../components/Drawing';
import PendingCard from '../components/PendingCard';
import SketchLoader from '../components/SketchLoader';
import Ingredients, { Scaler } from '../components/recipe/Ingredients';
import Steps from '../components/recipe/Steps';
import Notes from '../components/recipe/Notes';
import AddToListSheet from '../components/recipe/AddToListSheet';
import {
  IconCart, IconChef, IconClock, IconExternal, IconHeart, IconLeft, IconPhoto, IconPencil, IconRefresh, IconShare, IconTrash, IconUsers,
} from '../components/Icons';

export default function RecipePage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { recipes, loading, update, remove } = useRecipes();
  const recipe = recipes.find((r) => r.id === id);
  const [servings, setServings] = useServings(id, recipe?.servings ?? null);
  const [checked, toggle, resetChecked] = useChecklist(id);
  const [view, setView] = useState<'photo' | 'drawing'>('photo');
  const [listOpen, setListOpen] = useState(false);

  if (!recipe) {
    return loading ? <div className="empty"><SketchLoader /></div> : (
      <div className="empty"><h3>Receita não encontrada</h3><Link className="btn" to="/">Voltar às receitas</Link></div>
    );
  }

  const back = (
    <button className="back-link" onClick={() => (window.history.length > 1 ? nav(-1) : nav('/'))}><IconLeft /><span>Receitas</span></button>
  );

  if (recipe.status !== 'done') {
    return <div className="recipe">{back}<div style={{ marginTop: 16 }}><PendingCard recipe={recipe} /></div></div>;
  }

  const factor = recipe.servings ? servings / recipe.servings : 1;
  const hasBoth = !!recipe.cover_url && !!recipe.hero_svg;
  const showDrawing = (view === 'drawing' && recipe.hero_svg) || !recipe.cover_url;
  const ings = recipe.ingredients ?? [];

  const share = async () => {
    const url = `${location.origin}${location.pathname}#/receita/${recipe.id}`;
    try {
      if (navigator.share) await navigator.share({ title: recipe.title ?? 'Receita', url: recipe.source_url });
      else { await navigator.clipboard.writeText(url); toast('Link copiado'); }
    } catch { /* cancelled */ }
  };

  const reprocess = async () => {
    if (!confirm('Reprocessar esta receita? Os desenhos e o texto vão ser gerados de novo (as tuas notas ficam).')) return;
    if (await update(recipe.id, { status: 'queued', attempts: 0, error: null, locked_at: null })) { toast('Enviada para a fila'); nav('/'); }
  };

  const del = async () => {
    if (!confirm(`Apagar “${recipe.title}”? Isto não pode ser desfeito.`)) return;
    if (await remove(recipe.id)) { toast('Receita apagada'); nav('/'); }
  };

  return (
    <article className="recipe">
      <div className="recipe-top">{back}</div>

      <div className="recipe-hero">
        <div className="hero-media">
          {showDrawing ? (
            <Drawing svg={recipe.hero_svg} key="d" className="hero-drawing" label={`Desenho: ${recipe.title}`} />
          ) : (
            <img key="p" className="hero-photo" src={recipe.cover_url!} alt={recipe.title ?? ''} referrerPolicy="no-referrer" />
          )}
          {hasBoth && (
            <div className="seg hero-toggle">
              <button className={!showDrawing ? 'on' : ''} onClick={() => setView('photo')}><IconPhoto /> Foto do reel</button>
              <button className={showDrawing ? 'on' : ''} onClick={() => setView('drawing')}><IconPencil /> Desenho</button>
            </div>
          )}
        </div>

        <div className="hero-info">
          {recipe.category && <p className="kicker">{[recipe.category, recipe.cuisine].filter(Boolean).join(', ')}</p>}
          <h1>{recipe.title}</h1>
          {recipe.author && (
            <p className="author">por <a href={`https://www.instagram.com/${recipe.author.replace(/^@/, '')}/`} target="_blank" rel="noreferrer">@{recipe.author.replace(/^@/, '')}</a></p>
          )}
          {recipe.description && <p className="lede">{recipe.description}</p>}

          <dl className="meta">
            {recipe.prep_min ? <div><dt>Preparação</dt><dd>{formatMinutes(recipe.prep_min)}</dd></div> : null}
            {recipe.cook_min ? <div><dt>Cozedura</dt><dd>{formatMinutes(recipe.cook_min)}</dd></div> : null}
            <div><dt><IconClock /> Total</dt><dd>{formatMinutes(totalMinutes(recipe))}</dd></div>
            {recipe.servings ? <div><dt><IconUsers /> Porções</dt><dd>{recipe.servings}</dd></div> : null}
            {recipe.difficulty && <div><dt>Dificuldade</dt><dd className={`diff d-${recipe.difficulty}`}>{recipe.difficulty}</dd></div>}
          </dl>
          {recipe.tags?.length ? <div className="chips wrap tags">{recipe.tags.map((t) => <span key={t} className="tag">#{t}</span>)}</div> : null}

          <div className="hero-actions">
            <Link to={`/receita/${recipe.id}/cozinhar`} className="btn accent"><IconChef /> Começar a cozinhar</Link>
            <button className={`icon-btn fav-btn ${recipe.favorite ? 'on' : ''}`} onClick={() => update(recipe.id, { favorite: !recipe.favorite })} aria-label={recipe.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} aria-pressed={recipe.favorite}>
              <IconHeart />
            </button>
            <button className="icon-btn" onClick={share} aria-label="Partilhar"><IconShare /></button>
          </div>
          <a className="insta-link" href={recipe.source_url} target="_blank" rel="noreferrer"><IconExternal /> Ver no Instagram</a>
        </div>
      </div>

      <div className="recipe-body">
        <aside className="ing-panel card">
          <div className="panel-head">
            <h2>Ingredientes</h2>
            {checked.size > 0 && <button className="btn ghost small" onClick={resetChecked}>Desmarcar</button>}
          </div>
          {recipe.servings ? <Scaler servings={servings} base={recipe.servings} onChange={setServings} /> : null}
          <Ingredients list={ings} factor={factor} checked={checked} onToggle={toggle} />
          <button className="btn soft block" onClick={() => setListOpen(true)}><IconCart /> Adicionar à lista de compras</button>
        </aside>

        <section className="steps-panel">
          <h2>Preparação</h2>
          <Steps recipe={recipe} />

          {recipe.tips?.length ? (
            <div className="tips card">
              <h2 className="hand">Dicas</h2>
              <ul>{recipe.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          ) : null}

          <div className="notes-panel">
            <h2>As minhas notas</h2>
            <Notes id={recipe.id} value={recipe.notes} />
          </div>

          <div className="danger-zone">
            <button className="btn ghost small" onClick={reprocess}><IconRefresh /> Refazer desenhos / Reprocessar</button>
            <button className="btn danger small" onClick={del}><IconTrash /> Apagar receita</button>
          </div>
        </section>
      </div>

      {listOpen && <AddToListSheet recipe={recipe} servings={servings} onClose={() => setListOpen(false)} />}
    </article>
  );
}
