import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useRecipes } from '../hooks/useRecipes';
import { useChecklist, useServings } from '../hooks/useRecipeState';
import { useWakeLock } from '../hooks/useWakeLock';
import { formatAmount } from '../lib/quantity';
import { matches } from '../lib/ingredients';
import type { Ingredient } from '../lib/types';
import Drawing from '../components/Drawing';
import Sheet from '../components/Sheet';
import TimerTray from '../components/TimerTray';
import { useTimers } from '../hooks/useTimers';
import Ingredients, { Scaler } from '../components/recipe/Ingredients';
import { TimerButton } from '../components/recipe/Steps';
import { IconLeft, IconList, IconRight, IconX, IconHeart } from '../components/Icons';

function findIngredient(all: Ingredient[], name: string): Ingredient | undefined {
  return all.find((i) => i.name.toLowerCase() === name.toLowerCase()) ?? all.find((i) => matches(name, i.name));
}

export default function Cook() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const { recipes, update } = useRecipes();
  const recipe = recipes.find((r) => r.id === id);
  const [servings, setServings] = useServings(id, recipe?.servings ?? null);
  const [checked, toggle] = useChecklist(id);
  const [i, setI] = useState(() => { const s = Number(sessionStorage.getItem(`cook-step-${id}`)); return isFinite(s) ? s : 0; });
  const [drawer, setDrawer] = useState(false);
  const [dir, setDir] = useState<1 | -1>(1);
  const touch = useRef<{ x: number; y: number } | null>(null);
  useWakeLock(true);
  const { timers } = useTimers();

  const steps = recipe?.steps ?? [];
  const total = steps.length + 1; // + final screen
  const go = useCallback((n: number) => {
    setI((cur) => {
      const next = Math.max(0, Math.min(total - 1, n));
      setDir(next >= cur ? 1 : -1);
      return next;
    });
  }, [total]);

  useEffect(() => { sessionStorage.setItem(`cook-step-${id}`, String(i)); }, [i, id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (drawer) return;
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(i + 1); }
      if (e.key === 'ArrowLeft') go(i - 1);
      if (e.key === 'Escape') nav(`/receita/${id}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [i, go, nav, id, drawer]);

  if (!recipe) return <div className="cook"><div className="empty"><h3>Receita não encontrada</h3><Link to="/" className="btn">Voltar</Link></div></div>;

  const factor = recipe.servings ? servings / recipe.servings : 1;
  const all = recipe.ingredients ?? [];
  const step = steps[i];
  const isEnd = i >= steps.length;

  const onTouchStart = (e: React.TouchEvent) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const t = touch.current; touch.current = null;
    if (!t) return;
    const dx = e.changedTouches[0].clientX - t.x;
    const dy = e.changedTouches[0].clientY - t.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) go(i + (dx < 0 ? 1 : -1));
  };

  return (
    <div className="cook" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <header className="cook-head">
        <button className="icon-btn" onClick={() => nav(`/receita/${id}`)} aria-label="Sair do modo cozinha"><IconX /></button>
        <div className="cook-title">
          <span className="eyebrow">{isEnd ? 'Fim' : `Passo ${i + 1} de ${steps.length}`}</span>
          <strong>{recipe.title}</strong>
        </div>
        <button className="icon-btn" onClick={() => setDrawer(true)} aria-label="Ver todos os ingredientes"><IconList /></button>
      </header>

      <div className="cook-dots" role="tablist" aria-label="Passos">
        {Array.from({ length: total }, (_, k) => (
          <button key={k} role="tab" aria-selected={k === i} aria-label={k < steps.length ? `Passo ${k + 1}` : 'Fim'}
            className={`dot ${k === i ? 'on' : ''} ${k < i ? 'past' : ''}`} onClick={() => go(k)} />
        ))}
      </div>

      <main className={`cook-stage ${dir > 0 ? 'fwd' : 'back'} ${timers.length ? 'has-timers' : ''}`} key={i}>
        {!isEnd && step ? (
          <div className="cook-step">
            {step.svg && <Drawing svg={step.svg} replayKey={`${id}-${i}`} className="cook-drawing" label={step.title ?? `Passo ${step.n}`} />}
            <div className="cook-copy">
              <div className="step-head"><span className="step-n hand">{step.n}</span>{step.title && <h2>{step.title}</h2>}</div>
              <p className="cook-text">{step.text}</p>
              {step.ingredients?.length ? (
                <ul className="cook-ings">
                  {step.ingredients.map((name) => {
                    const ing = findIngredient(all, name);
                    return <li key={name}><b>{ing ? formatAmount(ing.quantity, ing.unit, factor) : ''}</b> {name}</li>;
                  })}
                </ul>
              ) : null}
              <TimerButton recipe={recipe} step={step} big />
            </div>
          </div>
        ) : (
          <div className="cook-end">
            {recipe.hero_svg ? <Drawing svg={recipe.hero_svg} replayKey="end" className="cook-drawing end" /> : null}
            <h2 className="hand bom">Bom apetite!</h2>
            <p className="muted">Espero que tenha ficado delicioso. Deixa uma nota para a próxima vez.</p>
            <div className="cook-end-actions">
              <button className={`btn ${recipe.favorite ? 'soft' : 'accent'}`} onClick={() => update(recipe.id, { favorite: !recipe.favorite })}>
                <IconHeart /> {recipe.favorite ? 'Nos favoritos' : 'Adicionar aos favoritos'}
              </button>
              <Link className="btn ghost" to={`/receita/${id}`} onClick={() => sessionStorage.removeItem(`cook-step-${id}`)}>Voltar à receita</Link>
            </div>
          </div>
        )}
      </main>

      <nav className="cook-nav">
        <button className="btn ghost" onClick={() => go(i - 1)} disabled={i === 0}><IconLeft /> Anterior</button>
        {!isEnd && <button className="btn accent" onClick={() => go(i + 1)}>{i === steps.length - 1 ? 'Terminar' : 'Seguinte'} <IconRight /></button>}
      </nav>

      <TimerTray inCook />

      {drawer && (
        <Sheet title="Ingredientes" onClose={() => setDrawer(false)}>
          {recipe.servings ? <Scaler servings={servings} base={recipe.servings} onChange={setServings} /> : null}
          <Ingredients list={all} factor={factor} checked={checked} onToggle={toggle} />
        </Sheet>
      )}
    </div>
  );
}
