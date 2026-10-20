import { FormEvent, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BackupSettingsInput,
  getBackupSettings,
  runBackupNow,
  testBackupSettings,
  updateBackupSettings,
} from '../api/backupSettings';
import { queryKeys } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { formatDateTime } from '../lib/dateFormat';
import { BackupSettings, BackupStatus } from '../types';

const inputClass = 'w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:opacity-50';
const labelClass = 'mb-1 block text-xs text-slate-400';

const STATUS: Record<BackupStatus, { label: string; className: string }> = {
  success: { label: 'Sucesso', className: 'bg-green-500/15 text-green-400' },
  error: { label: 'Erro', className: 'bg-red-500/15 text-red-400' },
  running: { label: 'Em andamento', className: 'bg-amber-500/15 text-amber-300' },
};

interface FormState {
  enabled: boolean;
  runTime: string;
  keepCount: string;
  ftpHost: string;
  ftpPort: string;
  ftpUser: string;
  ftpPassword: string;
  ftpDirectory: string;
  ftpTls: boolean;
  ftpWriteOnly: boolean;
}

function formFrom(settings: BackupSettings): FormState {
  return {
    enabled: settings.enabled,
    runTime: settings.runTime,
    keepCount: String(settings.keepCount),
    ftpHost: settings.ftpHost ?? '',
    ftpPort: String(settings.ftpPort),
    ftpUser: settings.ftpUser ?? '',
    ftpPassword: '',
    ftpDirectory: settings.ftpDirectory ?? '',
    ftpTls: settings.ftpTls,
    ftpWriteOnly: settings.ftpWriteOnly,
  };
}

function payloadFrom(form: FormState): BackupSettingsInput {
  return {
    enabled: form.enabled,
    runTime: form.runTime,
    keepCount: Number(form.keepCount),
    ftpHost: form.ftpHost,
    ftpPort: Number(form.ftpPort),
    ftpUser: form.ftpUser,
    ftpPassword: form.ftpPassword || undefined,
    ftpDirectory: form.ftpDirectory,
    ftpTls: form.ftpTls,
    ftpWriteOnly: form.ftpWriteOnly,
  };
}

function apiError(err: any, fallback: string): string {
  const message = err?.response?.data?.message;
  return Array.isArray(message) ? message.join(' ') : message || fallback;
}

export function BackupSettingsPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: queryKeys.backupSettings,
    queryFn: getBackupSettings,
    // Acompanha a execução até terminar ("Executar agora" ou horário agendado).
    refetchInterval: (query) => {
      const current = query.state.data;
      return current && (current.runRequestedAt || current.lastStatus === 'running') ? 3000 : false;
    },
  });

  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (settings && form === null) setForm(formFrom(settings));
  }, [settings, form]);

  const onResult = (message: string) => {
    setError(null);
    setNotice(message);
  };
  const onFailure = (fallback: string) => (err: unknown) => {
    setNotice(null);
    setError(apiError(err, fallback));
  };

  const saveMutation = useMutation({
    mutationFn: () => updateBackupSettings(payloadFrom(form!)),
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.backupSettings, saved);
      setForm(formFrom(saved));
      onResult('Configuração salva com sucesso.');
    },
    onError: onFailure('Falha ao salvar a configuração de backup'),
  });

  const testMutation = useMutation({
    mutationFn: () => testBackupSettings(payloadFrom(form!)),
    onSuccess: (result) => onResult(result.message),
    onError: onFailure('Falha ao testar a conexão'),
  });

  const runMutation = useMutation({
    mutationFn: runBackupNow,
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.backupSettings, saved);
      onResult('Backup iniciado; o resultado aparece acima.');
    },
    onError: onFailure('Falha ao pedir o backup'),
  });

  if (currentUser && currentUser.globalRole !== 'ADMIN') {
    return <Navigate to="/settings/profile" replace />;
  }

  if (isLoading || !settings || !form) return <Spinner />;

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => setForm({ ...form, [field]: value });
  const when = (iso: string | null) => (iso ? formatDateTime(iso, currentUser?.timezone) : '—');
  const status = settings.lastStatus ? STATUS[settings.lastStatus] : null;
  const busy = saveMutation.isPending || testMutation.isPending;
  const runPending = Boolean(settings.runRequestedAt) || settings.lastStatus === 'running';

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  return (
    <div>
      <h1 className="mb-2 text-lg font-semibold text-slate-100">Backup</h1>
      <p className="mb-6 text-xs text-slate-500">
        Envia todo dia um dump completo do banco (<code>projetoio-banco-AAAAMMDD-HHMMSS.sql.gz</code>) para um servidor
        FTP. O banco contém tudo o que o sistema guarda: projetos, itens, documentos, notas, usuários e configurações.
      </p>

      <dl className="mb-6 grid grid-cols-1 gap-3 rounded-md border border-slate-800 bg-slate-900/50 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-slate-500">Última execução</dt>
          <dd className="flex items-center gap-2 text-slate-200">
            {when(settings.lastAttemptAt)}
            {status && <span className={`rounded px-1.5 py-0.5 text-xs ${status.className}`}>{status.label}</span>}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Próxima execução</dt>
          <dd className="text-slate-200">
            {settings.runRequestedAt ? 'Pedida agora' : settings.enabled ? when(settings.nextRunAt) : 'Desativado'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Último sucesso</dt>
          <dd className="text-slate-200">{when(settings.lastSuccessAt)}</dd>
        </div>
        {settings.lastMessage && (
          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-500">Resultado</dt>
            <dd className="break-words text-slate-200">{settings.lastMessage}</dd>
          </div>
        )}
      </dl>

      <form onSubmit={onSubmit}>
        <label className="mb-4 flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={form.enabled} onChange={(e) => update('enabled', e.target.checked)} />
          Backup automático ativado
        </label>

        <div className="mb-3 flex gap-3">
          <div className="flex-1">
            <label className={labelClass}>Horário diário ({settings.timezone})</label>
            <input
              type="time"
              required
              value={form.runTime}
              onChange={(e) => update('runTime', e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex-1">
            <label className={labelClass}>Cópias mantidas no FTP</label>
            <input
              type="number"
              required
              min={1}
              max={365}
              disabled={form.ftpWriteOnly}
              title={form.ftpWriteOnly ? 'Destino só de gravação: a retenção fica a cargo do servidor de backup' : undefined}
              value={form.keepCount}
              onChange={(e) => update('keepCount', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="mb-3 flex gap-3">
          <div className="flex-[3]">
            <label className={labelClass}>Servidor FTP</label>
            <input
              type="text"
              placeholder="ftp.exemplo.com.br"
              required={form.enabled}
              value={form.ftpHost}
              onChange={(e) => update('ftpHost', e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex-1">
            <label className={labelClass}>Porta</label>
            <input
              type="number"
              required
              min={1}
              max={65535}
              value={form.ftpPort}
              onChange={(e) => update('ftpPort', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="mb-3 flex gap-3">
          <div className="flex-1">
            <label className={labelClass}>Usuário</label>
            <input
              type="text"
              autoComplete="off"
              value={form.ftpUser}
              onChange={(e) => update('ftpUser', e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex-1">
            <label className={labelClass}>Senha</label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder={settings.hasFtpPassword ? '•••••••• (deixe em branco para manter)' : ''}
              value={form.ftpPassword}
              onChange={(e) => update('ftpPassword', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <label className={labelClass}>Pasta no servidor</label>
        <input
          type="text"
          placeholder="/backups/projetoio"
          value={form.ftpDirectory}
          onChange={(e) => update('ftpDirectory', e.target.value)}
          className={`mb-3 ${inputClass}`}
        />

        <label className="mb-2 flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={form.ftpTls} onChange={(e) => update('ftpTls', e.target.checked)} />
          Usar FTPS (TLS explícito)
        </label>
        <label className="mb-3 flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={form.ftpWriteOnly}
            onChange={(e) => update('ftpWriteOnly', e.target.checked)}
          />
          Destino só de gravação (Pulse Backup)
        </label>

        <p className="mb-4 text-xs text-slate-500">
          {form.ftpWriteOnly
            ? 'Cada arquivo é enviado direto com o nome final (sem .part, conferência de tamanho ou renomeação) e nada é apagado no FTP: o histórico e a retenção ficam no servidor de backup.'
            : 'O arquivo vai como .part, tem o tamanho conferido e é renomeado no fim; as cópias mais antigas além do limite são apagadas da pasta (criada se não existir).'}{' '}
          Nenhuma cópia fica no servidor da aplicação. Sem FTPS, o dump trafega sem criptografia. Para restaurar, é
          preciso também a <code>ENCRYPTION_KEY</code> do <code>.env</code> (segredos de 2FA, senhas do SMTP/FTP e
          tokens ficam cifrados com ela no banco).
        </p>

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        {notice && <p className="mb-3 text-sm text-green-400">{notice}</p>}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy}>
            {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy || !form.ftpHost.trim()}
            onClick={() => testMutation.mutate()}
          >
            {testMutation.isPending ? 'Testando...' : 'Testar conexão'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={runMutation.isPending || runPending || !settings.ftpHost}
            title={settings.ftpHost ? undefined : 'Salve a configuração antes de executar'}
            onClick={() => runMutation.mutate()}
          >
            {runPending ? 'Executando...' : 'Executar agora'}
          </Button>
        </div>
      </form>
    </div>
  );
}
