import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { createAllowedDomain, deleteAllowedDomain, listAllowedDomains } from '../api/allowedDomains';
import { queryKeys } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { AllowedDomain } from '../types';
import { Button } from '../components/common/Button';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Spinner } from '../components/common/Spinner';
import { EmptyState } from '../components/common/EmptyState';

export function AllowedDomainsSettingsPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { data: domains, isLoading } = useQuery({ queryKey: queryKeys.allowedDomains, queryFn: listAllowedDomains });
  const [createOpen, setCreateOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<AllowedDomain | null>(null);

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteAllowedDomain(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allowedDomains });
      setRemoveTarget(null);
    },
  });

  if (currentUser && currentUser.globalRole !== 'ADMIN') {
    return <Navigate to="/settings/profile" replace />;
  }

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-100">Domínios permitidos</h1>
        <Button onClick={() => setCreateOpen(true)}>Adicionar domínio</Button>
      </div>
      <p className="mb-6 text-xs text-slate-500">
        Só e-mails desses domínios podem se autocadastrar em "Criar conta". Sem nenhum domínio na lista, o
        autocadastro fica bloqueado para todos.
      </p>

      {domains?.length === 0 && (
        <EmptyState title="Nenhum domínio permitido" description="Adicione um domínio para liberar o autocadastro." />
      )}

      {domains && domains.length > 0 && (
        <ul className="divide-y divide-slate-800 rounded-md border border-slate-800">
          {domains.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="text-sm text-slate-200">{d.domain}</span>
              <Button variant="ghost" onClick={() => setRemoveTarget(d)}>
                Remover
              </Button>
            </li>
          ))}
        </ul>
      )}

      <CreateAllowedDomainDialog open={createOpen} onOpenChange={setCreateOpen} />

      <ConfirmDialog
        open={!!removeTarget}
        title="Remover domínio"
        description={`Cadastros com e-mail em "${removeTarget?.domain}" deixarão de ser aceitos.`}
        confirmLabel="Remover"
        onConfirm={() => removeTarget && removeMutation.mutate(removeTarget.id)}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}

function CreateAllowedDomainDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [domain, setDomain] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => createAllowedDomain(domain.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allowedDomains });
      onOpenChange(false);
      setDomain('');
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'Falha ao adicionar domínio');
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-800 bg-slate-900 p-5 shadow-xl">
          <Dialog.Title className="mb-4 text-sm font-semibold text-slate-100">Adicionar domínio</Dialog.Title>
          <form onSubmit={onSubmit}>
            <label className="mb-1 block text-xs text-slate-400">Domínio</label>
            <input
              type="text"
              required
              placeholder="suaempresa.com.br"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="mb-3 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />

            {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Adicionando...' : 'Adicionar'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
