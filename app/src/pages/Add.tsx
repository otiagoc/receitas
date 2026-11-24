import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useRecipes, extractInstagramUrl, type AddResult } from '../hooks/useRecipes';
import SketchLoader from '../components/SketchLoader';
import { IconCheck, IconLink } from '../components/Icons';

const STATUS: Record<string, string> = {
  queued: 'Na fila. O Mac vai pegar nela assim que estiver ligado.',
  processing: 'A analisar o vídeo e a desenhar os passos…',
  done: 'Pronta! Já está no teu caderno.',
  error: 'Algo correu mal ao processar.',
};

export default function Add() {
  const [params, setParams] = useSearchParams();
  const { addUrl, recipes } = useRecipes();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AddResult | null>(null);
  const handled = useRef(false);

  const submit = async (raw: string) => {
    setBusy(true);
    setResult(await addUrl(raw));
    setBusy(false);
  };

  useEffect(() => {
    if (handled.current) return;
    const incoming = params.get('url') || params.get('text') || '';
    if (!incoming) return;
    handled.current = true;
    setText(incoming);
    setParams({}, { replace: true });
    void submit(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const paste = async () => {
    try { const t = await navigator.clipboard.readText(); setText(t); if (extractInstagramUrl(t)) void submit(t); } catch { /* not allowed */ }
  };

  const live = result?.ok ? recipes.find((r) => r.id === result.id) : undefined;

  if (result?.ok) {
    return (
      <div className="add-wrap">
        <div className="add-done card">
          {live?.status === 'done' || result.existing ? <div className="tick"><IconCheck /></div> : <SketchLoader size={140} />}
          <h2>{result.existing ? 'Já tinhas esta receita' : 'Receita adicionada!'}</h2>
          <p className="muted">{live ? (result.existing && live.status === 'done' ? 'Está guardada no teu caderno.' : STATUS[live.status]) : STATUS.queued}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {live?.status === 'done' ? <Link className="btn accent" to={`/receita/${live.id}`}>Abrir receita</Link> : <Link className="btn accent" to="/">Ver receitas</Link>}
            <button className="btn ghost" onClick={() => { setResult(null); setText(''); }}>Adicionar outra</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="add-wrap">
      <header className="page-head">
        <div>
          <p className="eyebrow">Nova receita</p>
          <h1>Adicionar</h1>
          <p className="sub">Cola o link de um reel ou publicação do Instagram com uma receita.</p>
        </div>
      </header>
      <form className="card" style={{ padding: 16, display: 'grid', gap: 12 }} onSubmit={(e) => { e.preventDefault(); void submit(text); }}>
        <label className="field">Link do Instagram
          <input className="input" type="url" inputMode="url" value={text} onChange={(e) => setText(e.target.value)} placeholder="https://www.instagram.com/reel/…" autoFocus />
        </label>
        {result && !result.ok && <p className="form-error">{result.error}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn accent" disabled={busy || !text.trim()} style={{ flex: 1 }}>{busy ? 'A adicionar…' : 'Adicionar receita'}</button>
          <button type="button" className="btn soft" onClick={paste}><IconLink /> Colar</button>
        </div>
      </form>
      <p className="muted" style={{ fontSize: '0.88rem' }}>
        Dica: no iPhone usa o atalho “Guardar receita” no menu Partilhar do Instagram; no Android instala esta app e partilha diretamente para “Receitas”.
      </p>
    </div>
  );
}
