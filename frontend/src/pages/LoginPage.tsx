import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { resendVerification } from '../api/auth';
import { Button } from '../components/common/Button';
import logo from '../assets/projeto-io-logo.svg';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/projects');
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Falha ao entrar';
      setError(message);
      setNeedsVerification(message.includes('Confirme seu e-mail'));
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    setResendState('sending');
    try {
      await resendVerification(email);
    } finally {
      setResendState('sent');
    }
  };

  return (
    <div className="flex h-screen flex-col items-center">
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <img src={logo} alt="Projeto.io" className="h-24 w-auto" />

        <form onSubmit={onSubmit} className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h1 className="mb-4 text-lg font-semibold text-slate-100">Entrar</h1>
          {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
          {needsVerification && (
            <button
              type="button"
              onClick={onResend}
              disabled={resendState === 'sending'}
              className="mb-3 text-xs text-indigo-400 hover:text-indigo-300"
            >
              {resendState === 'sending'
                ? 'Reenviando...'
                : resendState === 'sent'
                  ? 'E-mail reenviado'
                  : 'Reenviar e-mail de confirmação'}
            </button>
          )}
          <label className="mb-1 block text-xs text-slate-400">E-mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-3 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <label className="mb-1 block text-xs text-slate-400">Senha</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-4 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
          <p className="mt-3 text-center text-xs text-slate-500">
            Não tem conta? <Link to="/register" className="text-indigo-400">Cadastre-se</Link>
          </p>
        </form>
      </div>

      <footer className="pb-6 text-xs text-slate-600">Pulsar © 2026 Projeto.io • v0.1.0</footer>
    </div>
  );
}
