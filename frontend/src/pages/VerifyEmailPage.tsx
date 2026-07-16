import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '../api/auth';
import { Spinner } from '../components/common/Spinner';
import logo from '../assets/projeto-io-logo.svg';

type Status = 'loading' | 'success' | 'error';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Link de confirmação inválido.');
      return;
    }
    verifyEmail(token)
      .then((res) => {
        setStatus('success');
        setMessage(res.message || 'E-mail confirmado com sucesso.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err?.response?.data?.message || 'Não foi possível confirmar seu e-mail.');
      });
  }, [token]);

  return (
    <div className="flex h-screen flex-col items-center">
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <img src={logo} alt="Projeto.io" className="h-24 w-auto" />

        <div className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-900 p-6 text-center">
          {status === 'loading' && (
            <>
              <Spinner />
              <p className="mt-3 text-sm text-slate-400">Confirmando seu e-mail...</p>
            </>
          )}
          {status === 'success' && (
            <>
              <h1 className="mb-3 text-lg font-semibold text-slate-100">E-mail confirmado!</h1>
              <p className="mb-4 text-sm text-slate-400">{message}</p>
            </>
          )}
          {status === 'error' && (
            <>
              <h1 className="mb-3 text-lg font-semibold text-slate-100">Não foi possível confirmar</h1>
              <p className="mb-4 text-sm text-red-400">{message}</p>
            </>
          )}
          {status !== 'loading' && (
            <Link to="/login" className="text-sm text-indigo-400">
              Ir para o login
            </Link>
          )}
        </div>
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
