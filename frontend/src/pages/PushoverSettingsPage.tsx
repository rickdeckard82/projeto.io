import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPushoverSettings, updatePushoverSettings } from '../api/pushoverSettings';
import { queryKeys } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';

export function PushoverSettingsPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: queryKeys.pushoverSettings,
    queryFn: getPushoverSettings,
  });

  const [apiToken, setApiToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () => updatePushoverSettings({ apiToken: apiToken.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pushoverSettings });
      setApiToken('');
      setError(null);
      setSuccess(true);
    },
    onError: (err: any) => {
      setSuccess(false);
      setError(err?.response?.data?.message || 'Falha ao salvar configuração do Pushover');
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
      <h1 className="mb-2 text-lg font-semibold text-slate-100">Pushover</h1>
      <p className="mb-6 text-xs text-slate-500">
        API token da aplicação usada para enviar notificações por Pushover aos usuários que habilitarem esse canal em
        suas preferências. Crie uma aplicação em{' '}
        <a
          href="https://pushover.net/apps/build"
          target="_blank"
          rel="noreferrer"
          className="text-blue-400 hover:text-blue-300"
        >
          pushover.net/apps/build
        </a>{' '}
        e cole o token gerado abaixo.
      </p>

      <form onSubmit={onSubmit}>
        <label className="mb-1 block text-xs text-slate-400">API token da aplicação</label>
        <input
          type="password"
          placeholder={settings?.hasToken ? '•••••••• (deixe em branco para manter)' : ''}
          required={!settings?.hasToken}
          value={apiToken}
          onChange={(e) => setApiToken(e.target.value)}
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
