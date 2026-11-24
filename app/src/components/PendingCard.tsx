import type { Recipe } from '../lib/types';
import SketchLoader from './SketchLoader';
import { IconExternal, IconRefresh, IconTrash } from './Icons';
import { useRecipes } from '../hooks/useRecipes';
import { useToast } from '../hooks/useToast';

const MSG: Record<string, string> = {
  queued: 'Na fila — à espera do Mac…',
  processing: 'A analisar o vídeo…',
};

export default function PendingCard({ recipe }: { recipe: Recipe }) {
  const { retry, remove } = useRecipes();
  const toast = useToast();
  const isError = recipe.status === 'error';
  const short = recipe.source_url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

  return (
    <div className={`pending card ${isError ? 'is-error' : ''}`}>
      <div className="pending-art">
        {isError ? <span className="pending-err hand">ups!</span> : <SketchLoader size={96} />}
      </div>
      <div className="pending-body">
        <strong>{isError ? 'Não consegui ler esta receita' : MSG[recipe.status] ?? 'A preparar…'}</strong>
        <a href={recipe.source_url} target="_blank" rel="noreferrer" className="pending-url">{short} <IconExternal /></a>
        {isError && recipe.error && <p className="pending-msg">{recipe.error}</p>}
        {!isError && recipe.status === 'processing' && <div className="progress-line" />}
        <div className="pending-actions">
          {isError && (
            <button className="btn small" onClick={async () => { if (await retry(recipe.id)) toast('De volta à fila'); }}>
              <IconRefresh /> Tentar de novo
            </button>
          )}
          {(isError || recipe.status === 'queued') && (
            <button className="btn small ghost" onClick={async () => { if (confirm('Apagar este pedido?') && (await remove(recipe.id))) toast('Apagado'); }}>
              <IconTrash /> Apagar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
