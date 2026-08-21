import { FormEvent, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getTelegramSettings, updateTelegramSettings } from '../api/telegramSettings';
import { queryKeys } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';

export function TelegramSettingsPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: queryKeys.telegramSettings,
    queryFn: getTelegramSettings,
  });

  const [botToken, setBotToken] = useState('');
  const [botUsername, setBotUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setBotUsername(settings.botUsername || '');
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: () => updateTelegramSettings({ botToken: botToken.trim() || undefined, botUsername }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.telegramSettings });
      setBotToken('');
      setError(null);
      setSuccess(true);
    },
    onError: (err: any) => {
      setSuccess(false);
      setError(err?.response?.data?.message || 'Falha ao salvar configuração do Telegram');
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
    <div className="max-w-lg">
      <h1 className="mb-2 text-lg font-semibold text-slate-100">Telegram</h1>
      <p className="mb-6 text-xs text-slate-500">
        Bot usado para enviar notificações por Telegram aos usuários que habilitarem esse canal em suas preferências.
        Crie um bot conversando com{' '}
        <a
          href="https://t.me/BotFather"
          target="_blank"
          rel="noreferrer"
          className="text-blue-400 hover:text-blue-300"
        >
          @BotFather
        </a>{' '}
        e cole o token gerado abaixo.
      </p>

      <form onSubmit={onSubmit}>
        <label className="mb-1 block text-xs text-slate-400">Token do bot</label>
        <input
          type="password"
          placeholder={settings?.hasToken ? '•••••••• (deixe em branco para manter)' : ''}
          required={!settings?.hasToken}
          value={botToken}
          onChange={(e) => setBotToken(e.target.value)}
          className="mb-3 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />

        <label className="mb-1 block text-xs text-slate-400">Username do bot (opcional, só para exibição)</label>
        <input
          type="text"
          placeholder="@projetoio_bot"
          value={botUsername}
          onChange={(e) => setBotUsername(e.target.value)}
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
