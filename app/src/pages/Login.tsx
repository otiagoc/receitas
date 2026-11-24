import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Logo } from '../components/Layout';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError(error.message === 'Invalid login credentials' ? 'Email ou palavra-passe errados.' : error.message);
    setBusy(false);
  };

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <Logo />
        <p className="tagline">o meu caderno de receitas desenhadas</p>
        <div className="card" style={{ padding: 20, display: 'grid', gap: 14 }}>
          <label className="field">Email
            <input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="field">Palavra-passe
            <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="btn accent block" disabled={busy}>{busy ? 'A entrar…' : 'Entrar'}</button>
        </div>
      </form>
    </div>
  );
}
