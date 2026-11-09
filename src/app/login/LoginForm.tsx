'use client';
import { useState } from 'react';

export default function LoginForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        cache: 'no-store',
      });
      if (r.ok) {
        window.location.replace('/');
        return;
      }
      const d = await r.json().catch(() => null);
      setError(d?.message || 'No se pudo ingresar.');
    } catch {
      setError('Sin conexión. Intenta de nuevo.');
    }
    setEnviando(false);
  }

  return (
    <form onSubmit={enviar}>
      <label htmlFor="pw">Contraseña del panel</label>
      <input id="pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus required />
      {error ? <div className="error" role="alert">{error}</div> : null}
      <div className="acc">
        <button type="submit" className="primario ancho" disabled={enviando || !password}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </div>
    </form>
  );
}
