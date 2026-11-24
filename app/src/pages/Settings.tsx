import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useRecipes } from '../hooks/useRecipes';
import { useTheme, type Theme } from '../hooks/useTheme';
import { useToast } from '../hooks/useToast';
import { IconCopy, IconEye, IconEyeOff, IconLogout, IconMoon, IconSun, IconSparkle } from '../components/Icons';

const rtf = new Intl.RelativeTimeFormat('pt-PT', { numeric: 'auto' });
export function timeAgo(iso: string): string {
  const s = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(s);
  if (abs < 60) return rtf.format(Math.round(s), 'second');
  if (abs < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  return rtf.format(Math.round(s / 86400), 'day');
}

export default function Settings() {
  const { session } = useAuth();
  const { recipes } = useRecipes();
  const [theme, setTheme] = useTheme();
  const toast = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    supabase.from('share_tokens').select('token').limit(1).maybeSingle().then(({ data }) => setToken(data?.token ?? null));
  }, []);

  const worker = useMemo(() => {
    const processing = recipes.filter((r) => r.status === 'processing');
    const queued = recipes.filter((r) => r.status === 'queued');
    const lastDone = recipes.filter((r) => r.status === 'done').sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
    const oldestQueued = queued.sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
    const stale = !processing.length && oldestQueued && Date.now() - new Date(oldestQueued.created_at).getTime() > 10 * 60_000;
    return { processing, queued, lastDone, stale };
  }, [recipes]);

  const masked = token ? `${token.slice(0, 4)}${'•'.repeat(Math.max(4, token.length - 8))}${token.slice(-4)}` : '';
  const copy = async () => { if (!token) return; try { await navigator.clipboard.writeText(token); toast('Token copiado'); } catch { toast('Não foi possível copiar'); } };

  return (
    <div className="settings">
      <header className="page-head"><div><p className="eyebrow">Conta &amp; app</p><h1>Definições</h1></div></header>

      <section className="card">
        <h2>Atalho do iPhone</h2>
        <p className="muted">Guarda receitas diretamente do Instagram, sem abrir esta app.</p>
        <ol>
          <li>No iPhone, abre a app <b>Ficheiros</b> → <b>iCloud Drive</b> → pasta <b>Receitas</b> e toca no ficheiro do atalho (<code>.shortcut</code>).</li>
          <li>Toca em <b>Adicionar atalho</b>. Se pedir, cola o teu token (abaixo).</li>
          <li>No Instagram, num reel de receita, toca em <b>Partilhar</b> (avião de papel) → <b>Mais</b> / <b>Partilhar para…</b> → escolhe o atalho.</li>
          <li>Na primeira vez, autoriza o atalho a contactar o servidor. Pronto — a receita aparece aqui em poucos minutos.</li>
        </ol>
        <p className="muted" style={{ fontSize: '0.85rem' }}>Sem o atalho? Copia o link do reel e usa “Adicionar” nesta app. No Android, instala a app no ecrã principal e partilha diretamente para “Receitas”.</p>
        <div>
          <span className="eyebrow">O teu token</span>
          <div className="token-row" style={{ marginTop: 6 }}>
            <code>{token ? (show ? token : masked) : 'A carregar…'}</code>
            <button className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? 'Esconder token' : 'Mostrar token'}>{show ? <IconEyeOff /> : <IconEye />}</button>
            <button className="icon-btn" onClick={copy} aria-label="Copiar token"><IconCopy /></button>
          </div>
          <p className="muted" style={{ fontSize: '0.8rem', marginTop: 6 }}>Não partilhes este token: quem o tiver pode adicionar receitas à tua conta.</p>
        </div>
      </section>

      <section className="card">
        <h2>Processamento</h2>
        <p>
          <span className={`status-dot ${worker.processing.length ? 'ok' : worker.stale ? 'warn' : ''}`} />
          {worker.processing.length
            ? `O Mac está a processar ${worker.processing.length === 1 ? 'uma receita' : `${worker.processing.length} receitas`} agora.`
            : worker.queued.length
              ? `${worker.queued.length} ${worker.queued.length === 1 ? 'receita' : 'receitas'} na fila.`
              : 'Nada na fila.'}
        </p>
        {worker.lastDone && <p className="muted">Última receita pronta {timeAgo(worker.lastDone.updated_at)}: <i>{worker.lastDone.title}</i></p>}
        <p className="muted" style={{ fontSize: '0.88rem' }}>
          {worker.stale ? '⚠ Há receitas à espera há algum tempo. ' : ''}O Mac precisa de estar ligado para processar novas receitas. As que partilhares entretanto ficam na fila.
        </p>
      </section>

      <section className="card">
        <h2>Aparência</h2>
        <div className="seg" role="radiogroup" aria-label="Tema">
          {([['auto', 'Automático', IconSparkle], ['light', 'Claro', IconSun], ['dark', 'Escuro', IconMoon]] as [Theme, string, typeof IconSun][]).map(([k, l, I]) => (
            <button key={k} role="radio" aria-checked={theme === k} className={theme === k ? 'on' : ''} onClick={() => setTheme(k)}><I /> {l}</button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Sessão</h2>
        <p className="muted">Entraste como <b>{session?.user.email}</b>.</p>
        <button className="btn danger" style={{ justifySelf: 'start' }} onClick={() => supabase.auth.signOut()}><IconLogout /> Terminar sessão</button>
      </section>
      <p className="muted hand" style={{ textAlign: 'center', fontSize: '1.2rem' }}>Receitas · {recipes.filter((r) => r.status === 'done').length} receitas no caderno</p>
    </div>
  );
}
