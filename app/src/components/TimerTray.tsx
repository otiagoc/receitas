import { Link } from 'react-router-dom';
import { useTimers } from '../hooks/useTimers';
import { formatClock } from '../lib/alert';
import { IconPause, IconPlay, IconX } from './Icons';

export default function TimerTray({ inCook = false }: { inCook?: boolean }) {
  const { timers, toggle, dismiss, add, remainingOf } = useTimers();
  if (!timers.length) return null;
  return (
    <div className={`timer-tray ${inCook ? 'in-cook' : ''}`} role="region" aria-label="Temporizadores">
      {timers.map((t) => {
        const rem = remainingOf(t);
        const pct = t.total ? Math.max(0, Math.min(1, 1 - rem / t.total)) : 1;
        return (
          <div key={t.id} className={`timer-pill ${t.done ? 'done' : ''} ${!t.endsAt && !t.done ? 'paused' : ''}`}>
            <svg className="ring" viewBox="0 0 36 36" aria-hidden="true">
              <circle cx="18" cy="18" r="15" className="ring-bg" />
              <circle cx="18" cy="18" r="15" className="ring-fg" style={{ strokeDashoffset: 94.25 * (1 - pct) }} />
            </svg>
            <div className="timer-info">
              <strong>{t.done ? 'Pronto!' : formatClock(rem)}</strong>
              {inCook ? <span>{t.label}</span> : <Link to={`/receita/${t.recipeId}/cozinhar`}>{t.label}</Link>}
            </div>
            {t.done ? (
              <button className="icon-btn plain" onClick={() => add(t.id, 60)} aria-label="Mais 1 minuto">+1</button>
            ) : (
              <button className="icon-btn plain" onClick={() => toggle(t.id)} aria-label={t.endsAt ? 'Pausar' : 'Retomar'}>
                {t.endsAt ? <IconPause /> : <IconPlay />}
              </button>
            )}
            <button className="icon-btn plain" onClick={() => dismiss(t.id)} aria-label="Fechar temporizador"><IconX /></button>
          </div>
        );
      })}
    </div>
  );
}
