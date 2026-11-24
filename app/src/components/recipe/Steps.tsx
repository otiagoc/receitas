import type { Recipe, Step } from '../../lib/types';
import Drawing from '../Drawing';
import { IconClock, IconTimer } from '../Icons';
import { useTimers } from '../../hooks/useTimers';
import { formatClock } from '../../lib/alert';

export function TimerButton({ recipe, step, big = false }: { recipe: Recipe; step: Step; big?: boolean }) {
  const { start, timers } = useTimers();
  if (!step.timer_sec) return null;
  const label = step.title ? `Passo ${step.n}: ${step.title}` : `Passo ${step.n}`;
  const running = timers.some((t) => t.recipeId === recipe.id && t.label === label && !t.done);
  return (
    <button
      className={`btn ${big ? '' : 'small'} ${running ? 'soft' : 'accent'} timer-btn`}
      onClick={() => start({ label, recipeId: recipe.id, recipeTitle: recipe.title ?? 'Receita', total: step.timer_sec! })}
    >
      <IconTimer /> {running ? 'Outro' : 'Iniciar'} temporizador · {formatClock(step.timer_sec)}
    </button>
  );
}

export default function Steps({ recipe }: { recipe: Recipe }) {
  const steps = recipe.steps ?? [];
  return (
    <ol className="steps">
      {steps.map((s) => (
        <li key={s.n} className="step">
          {s.svg && <Drawing svg={s.svg} className="step-drawing" label={s.title ?? `Passo ${s.n}`} />}
          <div className="step-text">
            <div className="step-head">
              <span className="step-n hand">{s.n}</span>
              {s.title && <h3>{s.title}</h3>}
            </div>
            <p>{s.text}</p>
            <div className="step-foot">
              {s.duration_min ? <span className="tag"><IconClock /> {s.duration_min} min</span> : null}
              {s.ingredients?.length ? <span className="step-ings">{s.ingredients.join(' · ')}</span> : null}
            </div>
            <TimerButton recipe={recipe} step={s} />
          </div>
        </li>
      ))}
    </ol>
  );
}
