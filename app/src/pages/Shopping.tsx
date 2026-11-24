import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useShopping } from '../hooks/useShopping';
import { useRecipes } from '../hooks/useRecipes';
import { useToast } from '../hooks/useToast';
import { groupByAisle, listAsText, mergeForDisplay, type DisplayItem } from '../lib/shopping';
import { formatAmount } from '../lib/quantity';
import { normalizeName } from '../lib/ingredients';
import { AISLES } from '../lib/types';
import Sheet from '../components/Sheet';
import SketchLoader from '../components/SketchLoader';
import { IconCheck, IconPencil, IconPlus, IconShare, IconTrash } from '../components/Icons';

const UNITS = 'g|kg|ml|l|cl|dl|un|unidades?|c\\.? ?sopa|c\\.? ?chá|chávenas?|latas?|dentes?|pacotes?|embalagens?|molhos?';

/** "2 kg batatas" -> { quantity: 2, unit: 'kg', name: 'batatas' } */
export function parseManual(raw: string): { name: string; quantity: number | null; unit: string | null } {
  const m = raw.trim().match(new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(${UNITS})?\\s+(?:de\\s+)?(.+)$`, 'i'));
  if (!m) return { name: raw.trim(), quantity: null, unit: null };
  return { quantity: parseFloat(m[1].replace(',', '.')), unit: m[2] ?? null, name: m[3].trim() };
}

export default function Shopping() {
  const { items, loading, addItems, setChecked, removeItems, updateItem } = useShopping();
  const { recipes } = useRecipes();
  const toast = useToast();
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<DisplayItem | null>(null);

  const display = useMemo(() => mergeForDisplay(items), [items]);
  const groups = useMemo(() => groupByAisle(display), [display]);
  const checkedIds = items.filter((i) => i.checked).map((i) => i.id);
  const titleOf = (id: string) => recipes.find((r) => r.id === id)?.title ?? 'receita';

  const guessAisle = (name: string) => {
    const n = normalizeName(name);
    for (const r of recipes) for (const i of r.ingredients ?? []) if (normalizeName(i.name) === n && i.aisle) return i.aisle;
    return 'Outros';
  };

  const addManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const p = parseManual(text);
    setText('');
    await addItems([{ ...p, aisle: guessAisle(p.name), recipe_id: null }]);
  };

  const share = async () => {
    const t = listAsText(display);
    try {
      if (navigator.share) await navigator.share({ title: 'Lista de compras', text: t });
      else { await navigator.clipboard.writeText(t); toast('Lista copiada'); }
    } catch { /* cancelled */ }
  };

  const copy = async () => { try { await navigator.clipboard.writeText(listAsText(display)); toast('Lista copiada'); } catch { toast('Não foi possível copiar'); } };

  return (
    <div className="shopping">
      <header className="page-head">
        <div>
          <h1>Lista de compras</h1>
          {items.length > 0 && <p className="sub">{display.filter((d) => !d.checked).length} por comprar · {display.filter((d) => d.checked).length} no carrinho</p>}
        </div>
      </header>

      <form className="shop-add" onSubmit={addManual}>
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Adicionar… ex.: 1 kg batatas" aria-label="Novo item" enterKeyHint="done" />
        <button className="btn" aria-label="Adicionar"><IconPlus /></button>
      </form>

      {items.length > 0 && (
        <div className="shop-head-actions" style={{ marginBottom: 18 }}>
          <button className="btn soft small" onClick={share}><IconShare /> Partilhar</button>
          <button className="btn soft small" onClick={copy}>Copiar texto</button>
          {checkedIds.length > 0 && (
            <button className="btn danger small" onClick={async () => { await removeItems(checkedIds); toast('Comprados removidos'); }}>
              <IconTrash /> Limpar comprados ({display.filter((d) => d.checked).length})
            </button>
          )}
        </div>
      )}

      {loading ? <div className="empty"><SketchLoader /></div> : items.length === 0 ? (
        <div className="empty">
          <SketchLoader size={140} />
          <h3>A lista está vazia</h3>
          <p>Abre uma receita e toca em “Adicionar à lista de compras”, ou escreve acima.</p>
          <Link to="/" className="btn soft">Ver receitas</Link>
        </div>
      ) : (
        groups.map((g, gi) => (
          <section key={g.aisle} className="aisle" style={{ animationDelay: `${gi * 50}ms` }}>
            <h3>{g.aisle} <small>{g.items.filter((i) => !i.checked).length}/{g.items.length}</small></h3>
            <ul className="card">
              {g.items.map((it) => (
                <li key={it.key} className={`sitem ${it.checked ? 'checked' : ''}`}>
                  <button className="sitem-main" onClick={() => setChecked(it.ids, !it.checked)} aria-pressed={it.checked}>
                    <span className="cbox">{it.checked && <IconCheck />}</span>
                    <span className="sitem-txt">
                      <span className="sitem-name">{it.name}</span>
                      <span className="sitem-qty">{formatAmount(it.quantity, it.unit)}</span>
                      {it.recipeIds.length > 0 && <span className="sitem-from">de {it.recipeIds.map(titleOf).join(', ')}</span>}
                    </span>
                  </button>
                  <button className="icon-btn plain" onClick={() => setEditing(it)} aria-label={`Editar ${it.name}`}><IconPencil /></button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {editing && (
        <EditSheet
          item={editing}
          onClose={() => setEditing(null)}
          onDelete={async () => { await removeItems(editing.ids); setEditing(null); }}
          onSave={async (patch) => {
            const [first, ...rest] = editing.ids;
            await updateItem(first, patch);
            if (rest.length) await removeItems(rest);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EditSheet({ item, onClose, onSave, onDelete }: {
  item: DisplayItem; onClose: () => void; onDelete: () => void;
  onSave: (p: { name: string; quantity: number | null; unit: string | null; aisle: string }) => void;
}) {
  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState(item.quantity === null ? '' : String(Math.round(item.quantity * 100) / 100));
  const [unit, setUnit] = useState(item.unit ?? '');
  const [aisle, setAisle] = useState(item.aisle);
  return (
    <Sheet title="Editar item" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSave({ name: name.trim() || item.name, quantity: qty ? parseFloat(qty.replace(',', '.')) : null, unit: unit.trim() || null, aisle }); }}>
        <div className="edit-grid">
          <label className="field full">Nome<input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="field">Quantidade<input className="input" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="q.b." /></label>
          <label className="field">Unidade<input className="input" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="g, ml, un…" /></label>
          <label className="field full">Secção
            <select className="input" value={aisle} onChange={(e) => setAisle(e.target.value)}>
              {AISLES.map((a) => <option key={a}>{a}</option>)}
            </select>
          </label>
        </div>
        {item.ids.length > 1 && <p className="muted" style={{ fontSize: '0.82rem', marginTop: 10 }}>Este item junta {item.ids.length} entradas; ao guardar ficam numa só.</p>}
        <div className="edit-actions">
          <button type="button" className="btn danger small" onClick={onDelete}><IconTrash /> Apagar</button>
          <button className="btn accent">Guardar</button>
        </div>
      </form>
    </Sheet>
  );
}
