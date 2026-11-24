import { useState } from 'react';
import type { Recipe } from '../../lib/types';
import { formatAmount } from '../../lib/quantity';
import { isPantry } from '../../lib/ingredients';
import { useShopping } from '../../hooks/useShopping';
import { useToast } from '../../hooks/useToast';
import Sheet from '../Sheet';
import { IconCart, IconCheck } from '../Icons';
import { Scaler } from './Ingredients';

export default function AddToListSheet({ recipe, servings: initial, onClose }: { recipe: Recipe; servings: number; onClose: () => void }) {
  const list = recipe.ingredients ?? [];
  const [servings, setServings] = useState(initial);
  const [sel, setSel] = useState<Set<number>>(() => new Set(list.map((_, i) => i).filter((i) => !isPantry(list[i].name) && !list[i].optional)));
  const [busy, setBusy] = useState(false);
  const { addItems } = useShopping();
  const toast = useToast();
  const factor = recipe.servings ? servings / recipe.servings : 1;

  const toggle = (i: number) => setSel((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });

  const submit = async () => {
    setBusy(true);
    const ok = await addItems(list.filter((_, i) => sel.has(i)).map((ing) => ({
      name: ing.name,
      quantity: ing.quantity === null ? null : ing.quantity * factor,
      unit: ing.unit || null,
      aisle: ing.aisle || 'Outros',
      recipe_id: recipe.id,
    })));
    setBusy(false);
    toast(ok ? `${sel.size} ${sel.size === 1 ? 'item adicionado' : 'itens adicionados'} à lista` : 'Não foi possível adicionar');
    if (ok) onClose();
  };

  return (
    <Sheet title="Adicionar à lista" onClose={onClose}>
      <p className="muted" style={{ marginBottom: 12 }}>Desmarca o que já tens em casa.</p>
      {recipe.servings ? <Scaler servings={servings} base={recipe.servings} onChange={(n) => setServings(Math.max(1, n))} /> : null}
      <ul className="pick-list">
        {list.map((ing, i) => (
          <li key={i}>
            <button className={`pick ${sel.has(i) ? 'on' : ''}`} onClick={() => toggle(i)} aria-pressed={sel.has(i)}>
              <span className="cbox">{sel.has(i) && <IconCheck />}</span>
              <span className="pick-name">{ing.name}{ing.optional && <span className="opt">opcional</span>}</span>
              <span className="pick-amt">{formatAmount(ing.quantity, ing.unit, factor)}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="sheet-actions">
        <button className="btn ghost small" onClick={() => setSel(sel.size === list.length ? new Set() : new Set(list.map((_, i) => i)))}>
          {sel.size === list.length ? 'Desmarcar tudo' : 'Marcar tudo'}
        </button>
        <button className="btn accent" disabled={!sel.size || busy} onClick={submit}><IconCart /> Adicionar {sel.size}</button>
      </div>
    </Sheet>
  );
}
