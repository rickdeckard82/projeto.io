import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPrivacySettings, updatePrivacySettings } from '../api/privacySettings';
import { queryKeys } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';

export function PrivacySettingsPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: queryKeys.privacySettings,
    queryFn: getPrivacySettings,
  });

  const [controllerName, setControllerName] = useState('');
  const [controllerDocument, setControllerDocument] = useState('');
  const [dpoName, setDpoName] = useState('');
  const [dpoEmail, setDpoEmail] = useState('');
  const [retentionNotice, setRetentionNotice] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setControllerName(settings.controllerName || '');
      setControllerDocument(settings.controllerDocument || '');
      setDpoName(settings.dpoName || '');
      setDpoEmail(settings.dpoEmail || '');
      setRetentionNotice(settings.retentionNotice || '');
      setAdditionalNotes(settings.additionalNotes || '');
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: () =>
      updatePrivacySettings({
        controllerName: controllerName.trim() || undefined,
        controllerDocument: controllerDocument.trim() || undefined,
        dpoName: dpoName.trim() || undefined,
        dpoEmail: dpoEmail.trim() || undefined,
        retentionNotice: retentionNotice.trim() || undefined,
        additionalNotes: additionalNotes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.privacySettings });
      setError(null);
      setSuccess(true);
    },
    onError: (err: any) => {
      setSuccess(false);
      setError(err?.response?.data?.message || 'Falha ao salvar configuração de privacidade');
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
      <h1 className="mb-2 text-lg font-semibold text-slate-100">Privacidade (LGPD)</h1>
      <p className="mb-6 text-xs text-slate-500">
        Esses dados montam a página pública de{' '}
        <Link to="/privacidade" target="_blank" className="text-indigo-400">
          Política de Privacidade
        </Link>{' '}
        — este software pode ser hospedado por qualquer organização, então essa informação não vem fixa no código:
        cada instância informa aqui quem é o controlador dos dados tratados.
      </p>

      <form onSubmit={onSubmit}>
        <label className="mb-1 block text-xs text-slate-400">Nome do controlador (razão social)</label>
        <input
          type="text"
          placeholder="Sua Empresa Ltda."
          value={controllerName}
          onChange={(e) => setControllerName(e.target.value)}
          className="mb-3 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />

        <label className="mb-1 block text-xs text-slate-400">CNPJ/CPF do controlador (opcional)</label>
        <input
          type="text"
          placeholder="00.000.000/0001-00"
          value={controllerDocument}
          onChange={(e) => setControllerDocument(e.target.value)}
          className="mb-3 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />

        <label className="mb-1 block text-xs text-slate-400">Nome do encarregado (DPO)</label>
        <input
          type="text"
          placeholder="Opcional, se ainda não houver um designado"
          value={dpoName}
          onChange={(e) => setDpoName(e.target.value)}
          className="mb-3 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />

        <label className="mb-1 block text-xs text-slate-400">E-mail de contato do encarregado (DPO)</label>
        <input
          type="email"
          placeholder="dpo@suaempresa.com.br"
          value={dpoEmail}
          onChange={(e) => setDpoEmail(e.target.value)}
          className="mb-3 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />

        <label className="mb-1 block text-xs text-slate-400">Prazo de retenção de dados (texto livre)</label>
        <input
          type="text"
          placeholder="Ex.: enquanto a conta estiver ativa, mais 12 meses após a desativação"
          value={retentionNotice}
          onChange={(e) => setRetentionNotice(e.target.value)}
          className="mb-3 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />

        <label className="mb-1 block text-xs text-slate-400">Observações adicionais (opcional)</label>
        <textarea
          rows={4}
          placeholder="Qualquer informação extra que queira incluir na Política de Privacidade"
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
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
