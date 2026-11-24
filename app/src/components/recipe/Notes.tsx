import { useEffect, useRef, useState } from 'react';
import { useRecipes } from '../../hooks/useRecipes';

export default function Notes({ id, value }: { id: string; value: string | null }) {
  const { update } = useRecipes();
  const [text, setText] = useState(value ?? '');
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const timer = useRef<number>();
  const dirty = useRef(false);

  useEffect(() => { if (!dirty.current) setText(value ?? ''); }, [value]);

  const save = async (v: string) => {
    setState('saving');
    const ok = await update(id, { notes: v || null });
    dirty.current = false;
    setState(ok ? 'saved' : 'error');
  };

  return (
    <div className="notes">
      <textarea
        className="textarea notes-area"
        value={text}
        placeholder="As minhas notas: menos açúcar, forno a 180 °C, ficou ótimo com…"
        onChange={(e) => {
          dirty.current = true;
          setText(e.target.value);
          setState('idle');
          window.clearTimeout(timer.current);
          const v = e.target.value;
          timer.current = window.setTimeout(() => void save(v), 900);
        }}
        onBlur={() => { if (dirty.current) { window.clearTimeout(timer.current); void save(text); } }}
      />
      <span className={`notes-state ${state}`}>
        {state === 'saving' ? 'A guardar…' : state === 'saved' ? 'Guardado ✓' : state === 'error' ? 'Erro ao guardar' : ''}
      </span>
    </div>
  );
}
