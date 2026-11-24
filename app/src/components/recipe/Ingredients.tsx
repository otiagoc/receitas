import type { Ingredient } from '../../lib/types';
import { formatAmount } from '../../lib/quantity';
import { IconCheck, IconMinus, IconPlus } from '../Icons';

export function groupIngredients(list: Ingredient[]): { group: string; items: { ing: Ingredient; idx: number }[] }[] {
  const out: { group: string; items: { ing: Ingredient; idx: number }[] }[] = [];
  list.forEach((ing, idx) => {
    const g = ing.group?.trim() || '';
    let bucket = out.find((b) => b.group === g);
    if (!bucket) { bucket = { group: g, items: [] }; out.push(bucket); }
    bucket.items.push({ ing, idx });
  });
  return out;
}

export function Scaler({ servings, base, onChange }: { servings: number; base: number | null; onChange: (n: number) => void }) {
  return (
    <div className="scaler" role="group" aria-label="Porções">
      <button className="icon-btn" onClick={() => onChange(servings - 1)} disabled={servings <= 1} aria-label="Menos uma porção"><IconMinus /></button>
      <div className="scaler-val">
        <strong key={servings}>{servings}</strong>
        <span>{servings === 1 ? 'porção' : 'porções'}</span>
      </div>
      <button className="icon-btn" onClick={() => onChange(servings + 1)} aria-label="Mais uma porção"><IconPlus /></button>
      {base && servings !== base && <button className="btn ghost small" onClick={() => onChange(base)}>repor {base}</button>}
    </div>
  );
}

export function IngredientRow({ ing, factor, checked, onToggle }: { ing: Ingredient; factor: number; checked: boolean; onToggle: () => void }) {
  const amt = formatAmount(ing.quantity, ing.unit, factor);
  return (
    <li className={`ing ${checked ? 'checked' : ''}`}>
      <button className="ing-btn" onClick={onToggle} aria-pressed={checked}>
        <span className="cbox">{checked && <IconCheck />}</span>
        <span className="ing-amt">{amt}</span>
        <span className="ing-name">
          {ing.name}
          {ing.note && <em> — {ing.note}</em>}
          {ing.optional && <span className="opt">opcional</span>}
        </span>
      </button>
    </li>
  );
}

export default function Ingredients({ list, factor, checked, onToggle }: { list: Ingredient[]; factor: number; checked: Set<number>; onToggle: (i: number) => void }) {
  return (
    <div className="ingredients">
      {groupIngredients(list).map(({ group, items }) => (
        <div key={group || '_'} className="ing-group">
          {group && <h4 className="hand">{group}</h4>}
          <ul>
            {items.map(({ ing, idx }) => (
              <IngredientRow key={idx} ing={ing} factor={factor} checked={checked.has(idx)} onToggle={() => onToggle(idx)} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
