import { FormEvent, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSmtpSettings, updateSmtpSettings } from '../api/smtpSettings';
import { queryKeys } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';

export function SmtpSettingsPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({ queryKey: queryKeys.smtpSettings, queryFn: getSmtpSettings });

  const [host, setHost] = useState('');
  const [port, setPort] = useState('587');
  const [useSsl, setUseSsl] = useState(false);
  const [fromEmail, setFromEmail] = useState('');
  const [authUser, setAuthUser] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setHost(settings.host);
      setPort(String(settings.port));
      setUseSsl(settings.useSsl);
      setFromEmail(settings.fromEmail);
      setAuthUser(settings.authUser);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: () =>
      updateSmtpSettings({
        host,
        port: Number(port),
        useSsl,
        fromEmail,
        authUser,
        authPass: authPass.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.smtpSettings });
      setAuthPass('');
      setError(null);
      setSuccess(true);
    },
    onError: (err: any) => {
      setSuccess(false);
      setError(err?.response?.data?.message || 'Falha ao salvar configuração de e-mail');
    },
  });

  if (currentUser && currentUser.globalRole !== 'ADMIN') {
    return <Navigate to="/settings/profile" replace />;
  }

  if (isLoading) return <Spinner />;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    mutation.mutate();
  };

  return (
    <div>
      <h1 className="mb-2 text-lg font-semibold text-slate-100">E-mail (SMTP)</h1>
      <p className="mb-6 text-xs text-slate-500">
        Servidor usado para enviar o e-mail de confirmação de cadastro aos novos usuários.
      </p>

      <form onSubmit={onSubmit}>
        <label className="mb-1 block text-xs text-slate-400">Servidor SMTP</label>
        <input
          type="text"
          required
          placeholder="smtp.gmail.com"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          className="mb-3 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />

        <div className="mb-3 flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-slate-400">Porta</label>
            <input
              type="number"
              required
              min={1}
              max={65535}
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-300">
            <input type="checkbox" checked={useSsl} onChange={(e) => setUseSsl(e.target.checked)} />
            Usar SSL
          </label>
        </div>

        <label className="mb-1 block text-xs text-slate-400">E-mail de envio</label>
        <input
          type="email"
          required
          placeholder="noreply@suaempresa.com.br"
          value={fromEmail}
          onChange={(e) => setFromEmail(e.target.value)}
          className="mb-3 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />

        <label className="mb-1 block text-xs text-slate-400">Usuário (login)</label>
        <input
          type="text"
          required
          value={authUser}
          onChange={(e) => setAuthUser(e.target.value)}
          className="mb-3 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />

        <label className="mb-1 block text-xs text-slate-400">Senha</label>
        <input
          type="password"
          placeholder={settings?.hasPassword ? '•••••••• (deixe em branco para manter)' : ''}
          required={!settings?.hasPassword}
          value={authPass}
          onChange={(e) => setAuthPass(e.target.value)}
          className="mb-4 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        {success && <p className="mb-3 text-sm text-green-400">Configuração salva com sucesso.</p>}

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </form>
    </div>
  );
}
