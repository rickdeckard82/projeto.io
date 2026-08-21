import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getNotificationPreferences,
  testTelegramNotification,
  testWebhookNotification,
  updateNotificationPreferences,
} from '../api/notifications';
import { queryKeys } from '../api/queryKeys';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';

export function NotificationSettingsPage() {
  const queryClient = useQueryClient();
  const { data: prefs, isLoading } = useQuery({
    queryKey: queryKeys.notificationPreferences,
    queryFn: getNotificationPreferences,
  });

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  useEffect(() => {
    if (prefs) {
      setEmailEnabled(prefs.emailEnabled);
      setTelegramEnabled(prefs.telegramEnabled);
      setWebhookEnabled(prefs.webhookEnabled);
      setTelegramChatId(prefs.telegramChatId || '');
      setWebhookUrl(prefs.webhookUrl || '');
    }
  }, [prefs]);

  const mutation = useMutation({
    mutationFn: () =>
      updateNotificationPreferences({ emailEnabled, telegramEnabled, webhookEnabled, telegramChatId, webhookUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationPreferences });
      setError(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    },
    onError: (err: any) => {
      setSuccess(false);
      setError(err?.response?.data?.message || 'Falha ao salvar preferências de notificação');
    },
  });

  const testTelegramMutation = useMutation({
    mutationFn: testTelegramNotification,
    onSuccess: (data) => setTestMessage(data.message),
    onError: (err: any) => setTestMessage(err?.response?.data?.message || 'Falha ao enviar teste do Telegram'),
  });

  const testWebhookMutation = useMutation({
    mutationFn: testWebhookNotification,
    onSuccess: (data) => setTestMessage(data.message),
    onError: (err: any) => setTestMessage(err?.response?.data?.message || 'Falha ao enviar teste do webhook'),
  });

  if (isLoading) return <Spinner />;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setTestMessage(null);
    mutation.mutate();
  };

  return (
    <div className="max-w-lg">
      <h1 className="mb-2 text-lg font-semibold text-slate-100">Notificações</h1>
      <p className="mb-6 text-xs text-slate-500">
        Alertas de vencimento de tarefa e de nova atribuição aparecem sempre no sino, no topo da página. Escolha
        abaixo quais canais também devem receber um reforço.
      </p>

      <form onSubmit={onSubmit} className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <label className="mb-3 flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={emailEnabled} onChange={(e) => setEmailEnabled(e.target.checked)} />
          Receber por e-mail
        </label>

        <label className="mb-1 flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={telegramEnabled} onChange={(e) => setTelegramEnabled(e.target.checked)} />
          Receber por Telegram
        </label>
        <p className="mb-2 ml-6 text-xs text-slate-500">
          Converse com o bot configurado pelo administrador e informe o chat id recebido dele abaixo. Salve antes de
          testar — o teste usa o valor já salvo, não o que está no campo.
        </p>
        <div className="mb-3 ml-6 flex gap-2">
          <input
            type="text"
            placeholder="Chat id do Telegram"
            value={telegramChatId}
            onChange={(e) => setTelegramChatId(e.target.value)}
            className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={!telegramChatId || testTelegramMutation.isPending}
            onClick={() => testTelegramMutation.mutate()}
          >
            {testTelegramMutation.isPending ? 'Enviando...' : 'Testar'}
          </Button>
        </div>

        <label className="mb-1 flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={webhookEnabled} onChange={(e) => setWebhookEnabled(e.target.checked)} />
          Receber por webhook
        </label>
        <p className="mb-2 ml-6 text-xs text-slate-500">
          Cada notificação é enviada via POST em JSON, assinado com HMAC-SHA256 no header{' '}
          <code className="text-slate-400">X-Signature</code>
          {prefs?.hasWebhookSecret ? ' (segredo já gerado).' : '.'} Salve antes de testar — o teste usa a URL já
          salva, não a que está no campo.
        </p>
        <div className="mb-4 ml-6 flex gap-2">
          <input
            type="url"
            placeholder="https://exemplo.com/webhook"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={!webhookUrl || testWebhookMutation.isPending}
            onClick={() => testWebhookMutation.mutate()}
          >
            {testWebhookMutation.isPending ? 'Enviando...' : 'Testar'}
          </Button>
        </div>

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        {success && <p className="mb-3 text-sm text-emerald-400">Preferências salvas.</p>}
        {testMessage && <p className="mb-3 text-sm text-slate-400">{testMessage}</p>}

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Salvando...' : 'Salvar preferências'}
        </Button>
      </form>
    </div>
  );
}
