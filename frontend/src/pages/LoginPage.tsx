import { FormEvent, useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { resendVerification } from '../api/auth';
import { Button } from '../components/common/Button';
import { Turnstile, turnstileEnabled } from '../components/common/Turnstile';
import { AuthWaves } from '../components/common/AuthWaves';
import logo from '../assets/projeto-io-logo.svg';
import { APP_VERSION } from '../lib/appInfo';

export function LoginPage() {
  const { login, verifyTwoFactor } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const handleTurnstile = useCallback((t: string | null) => setTurnstileToken(t), []);
  const resetTurnstile = () => {
    setTurnstileToken(null);
    setTurnstileKey((k) => k + 1);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setLoading(true);
    try {
      const result = await login(email, password, turnstileToken);
      if (result.requiresTwoFactor && result.challengeToken) {
        setChallengeToken(result.challengeToken);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Falha ao entrar';
      setError(message);
      setNeedsVerification(message.includes('Confirme seu e-mail'));
      resetTurnstile();
    } finally {
      setLoading(false);
    }
  };

  const onSubmitCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!challengeToken) return;
    setError(null);
    setLoading(true);
    try {
      await verifyTwoFactor(challengeToken, code, rememberDevice);
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Código inválido');
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
    <div className="relative flex h-screen flex-col items-center overflow-hidden">
      <AuthWaves />
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8">
        <img src={logo} alt="Projeto.io" className="h-24 w-auto" />

        {challengeToken ? (
          <form
            onSubmit={onSubmitCode}
            className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-900 p-6"
          >
            <h1 className="mb-1 text-lg font-semibold text-slate-100">Verificação em duas etapas</h1>
            <p className="mb-4 text-xs text-slate-400">
              Digite o código do seu app autenticador, ou um código de recuperação.
            </p>
            {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
            <label className="mb-1 block text-xs text-slate-400">Código</label>
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              className="mb-3 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
            <label className="mb-4 flex items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
              />
              Lembrar este dispositivo por 30 dias
            </label>
            <Button type="submit" disabled={loading || !code.trim()} className="w-full">
              {loading ? 'Verificando...' : 'Verificar'}
            </Button>
            <p className="mt-3 text-center text-xs text-slate-500">
              <button
                type="button"
                onClick={() => {
                  setChallengeToken(null);
                  setCode('');
                  setError(null);
                }}
                className="text-indigo-400 hover:text-indigo-300"
              >
                Voltar
              </button>
            </p>
          </form>
        ) : (
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
            <Turnstile key={turnstileKey} onToken={handleTurnstile} />
            <Button type="submit" disabled={loading || (turnstileEnabled && !turnstileToken)} className="w-full">
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
            <p className="mt-3 text-center text-xs text-slate-500">
              Não tem conta? <Link to="/register" className="text-indigo-400">Cadastre-se</Link>
            </p>
          </form>
        )}
      </div>

      <footer className="relative z-10 pb-6 text-center text-xs text-slate-600">
        H2NODE © 2026 Projeto.io • v{APP_VERSION}
        <br />
        <Link to="/privacidade" target="_blank" className="hover:text-slate-400">
          Política de Privacidade
        </Link>
      </footer>
    </div>
  );
}
