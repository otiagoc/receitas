import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRecipes } from '../hooks/useRecipes';
import { isPantry, normalizeName, rankByIngredients } from '../lib/ingredients';
import { Cover } from '../components/RecipeCard';
import { IconPlus, IconX } from '../components/Icons';
import { formatMinutes, totalMinutes } from '../lib/types';

const KEY = 'wcc-have';

export default function WhatCanICook() {
  const { recipes } = useRecipes();
  const [have, setHave] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } });
  const [text, setText] = useState('');
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(have)); } catch { /* ignore */ } }, [have]);

  const add = (raw: string) => {
    const parts = raw.split(/[,;\n]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    setHave((h) => {
      const next = [...h];
      for (const p of parts) if (!next.some((x) => normalizeName(x) === normalizeName(p))) next.push(p);
      return next;
    });
    setText('');
  };

  const suggestions = useMemo(() => {
    const count = new Map<string, { name: string; n: number }>();
    for (const r of recipes) {
      if (r.status !== 'done') continue;
      for (const i of r.ingredients ?? []) {
        if (isPantry(i.name)) continue;
        const k = normalizeName(i.name);
        const e = count.get(k) ?? { name: i.name, n: 0 };
        e.n++;
        count.set(k, e);
      }
    }
    const haveKeys = new Set(have.map(normalizeName));
    return [...count.entries()].filter(([k]) => !haveKeys.has(k)).sort((a, b) => b[1].n - a[1].n).slice(0, 18).map(([, v]) => v.name);
  }, [recipes, have]);

  const ranked = useMemo(() => rankByIngredients(recipes, have), [recipes, have]);

  return (
    <div className="wcc">
      <header className="page-head">
        <div>
          <p className="eyebrow">Frigorífico &amp; despensa</p>
          <h1>O que faço com…?</h1>
          <p className="sub">Diz-me o que tens e eu encontro a receita certa. Sal, pimenta, azeite e água não contam.</p>
        </div>
      </header>

      <form className="wcc-input" onSubmit={(e) => { e.preventDefault(); add(text); }}>
        {have.map((h) => (
          <button type="button" key={h} className="chip" onClick={() => setHave((x) => x.filter((y) => y !== h))} aria-label={`Remover ${h}`}>
            {h} <IconX />
          </button>
        ))}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Backspace' && !text && have.length) setHave((x) => x.slice(0, -1)); }}
          onBlur={() => text.trim() && add(text)}
          placeholder={have.length ? 'mais…' : 'ex.: ovos, espinafres, queijo feta'}
          aria-label="Ingrediente"
          enterKeyHint="done"
        />
        {have.length > 0 && <button type="button" className="btn ghost small" onClick={() => setHave([])}>Limpar</button>}
      </form>

      {suggestions.length > 0 && (
        <div className="chips wrap wcc-suggest">
          {suggestions.map((s) => (
            <button key={s} className="chip" onClick={() => add(s)}><IconPlus /> {s}</button>
          ))}
        </div>
      )}

      {have.length > 0 && (
        ranked.length === 0 ? (
          <div className="empty"><h3>Hmm, nada ainda</h3><p>Nenhuma receita usa esses ingredientes. Tenta outros!</p></div>
        ) : (
          <div className="wcc-results">
            {ranked.map(({ recipe, coverage, missing }, i) => (
              <Link key={recipe.id} to={`/receita/${recipe.id}`} className="wcc-row card" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="wcc-thumb"><Cover recipe={recipe} /></div>
                <div className="wcc-info">
                  <h3>{recipe.title}</h3>
                  <div className="meter"><span style={{ width: `${Math.round(coverage * 100)}%` }} /></div>
                  <p className="wcc-miss">
                    {missing.length === 0 ? <b style={{ color: 'var(--sage)' }}>Tens tudo!</b> : <>falta: <b>{missing.join(', ')}</b></>}
                  </p>
                  <span className="muted" style={{ fontSize: '0.78rem' }}>{formatMinutes(totalMinutes(recipe))}{recipe.difficulty ? ` · ${recipe.difficulty}` : ''}</span>
                </div>
                <span className="wcc-pct">{Math.round(coverage * 100)}%</span>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
}
