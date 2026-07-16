import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { resendVerification } from '../api/auth';
import { Button } from '../components/common/Button';
import logo from '../assets/projeto-io-logo.svg';

export function RegisterPage() {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(email, password, fullName);
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao cadastrar');
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

        {submitted ? (
          <div className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-900 p-6 text-center">
            <h1 className="mb-3 text-lg font-semibold text-slate-100">Verifique seu e-mail</h1>
            <p className="mb-4 text-sm text-slate-400">
              Enviamos um e-mail de confirmação para <strong className="text-slate-200">{email}</strong>. Clique no
              link para ativar sua conta antes de entrar.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={resendState === 'sending'}
              onClick={onResend}
            >
              {resendState === 'sending'
                ? 'Reenviando...'
                : resendState === 'sent'
                  ? 'E-mail reenviado'
                  : 'Reenviar e-mail'}
            </Button>
            <p className="mt-3 text-center text-xs text-slate-500">
              <Link to="/login" className="text-indigo-400">
                Ir para o login
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-900 p-6">
            <h1 className="mb-4 text-lg font-semibold text-slate-100">Criar conta</h1>
            {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
            <label className="mb-1 block text-xs text-slate-400">Nome completo</label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mb-3 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
            <label className="mb-1 block text-xs text-slate-400">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-3 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
            <label className="mb-1 block text-xs text-slate-400">Senha (mín. 8 caracteres)</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-4 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </Button>
            <p className="mt-3 text-center text-xs text-slate-500">
              Você será cadastrado como <strong>Membro</strong>. Um administrador pode alterar seu papel depois.
            </p>
            <p className="mt-2 text-center text-xs text-slate-500">
              Já tem conta? <Link to="/login" className="text-indigo-400">Entrar</Link>
            </p>
          </form>
        )}
      </div>

      <footer className="pb-6 text-center text-xs text-slate-600">
        Pulsar © 2026 Projeto.io • v0.1.0
        <br />
        <Link to="/privacidade" target="_blank" className="hover:text-slate-400">
          Política de Privacidade
        </Link>
      </footer>
    </div>
  );
}
