import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { createApiKey, deleteApiKey, listApiKeys } from '../api/apiKeys';
import { API_BASE_URL } from '../api/client';
import { queryKeys } from '../api/queryKeys';
import { listUsers } from '../api/users';
import { useAuth } from '../auth/AuthContext';
import { ApiKey } from '../types';
import { Button } from '../components/common/Button';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { Spinner } from '../components/common/Spinner';
import { formatDateTime } from '../lib/dateFormat';

/** Chaves de API usadas para conectar o Claude Code (MCP). Admin não tem chave própria, mas gerencia as dos demais usuários. */
export function ApiKeysSettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: keys, isLoading, isError } = useQuery({ queryKey: queryKeys.apiKeys, queryFn: listApiKeys });
  const [createOpen, setCreateOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ApiKey | null>(null);

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys });
      setRemoveTarget(null);
    },
  });

  if (!user) return null;
  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-100">Chaves de API</h1>
        <Button onClick={() => setCreateOpen(true)}>Criar chave</Button>
      </div>
      <p className="mb-6 text-xs text-slate-500">
        Conectam o Claude (connector do claude.ai ou Claude Code) ao Projeto.io com as permissões do dono da chave. Valem por 90 dias. Contas de
        administrador não podem ter chave.
      </p>

      {isError && <p className="mb-3 text-sm text-red-400">Falha ao carregar as chaves.</p>}
      {removeMutation.isError && <p className="mb-3 text-sm text-red-400">Falha ao revogar a chave.</p>}

      {keys?.length === 0 && (
        <EmptyState title="Nenhuma chave" description="Crie uma chave para conectar o Claude Code." />
      )}

      {keys && keys.length > 0 && (
        <ul className="divide-y divide-slate-800 rounded-md border border-slate-800">
          {keys.map((key) => {
            const expired = new Date(key.expiresAt) <= new Date();
            return (
              <li key={key.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                <div className="min-w-0">
                  <p className="text-sm text-slate-200">
                    {key.name} <code className="text-xs text-slate-500">{key.prefix}…</code>
                  </p>
                  <p className="text-slate-500">
                    {key.user.fullName} ·{' '}
                    <span className={expired ? 'text-red-400' : ''}>
                      {expired ? 'expirou' : 'expira'} em {formatDateTime(key.expiresAt, user.timezone)}
                    </span>{' '}
                    · {key.lastUsedAt ? `usada em ${formatDateTime(key.lastUsedAt, user.timezone)}` : 'nunca usada'}
                  </p>
                </div>
                <Button variant="ghost" onClick={() => setRemoveTarget(key)}>
                  Revogar
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {createOpen && <CreateApiKeyDialog isAdmin={user.globalRole === 'ADMIN'} onClose={() => setCreateOpen(false)} />}

      <ConfirmDialog
        open={!!removeTarget}
        title="Revogar chave"
        description={`A chave "${removeTarget?.name}" deixa de funcionar imediatamente.`}
        confirmLabel="Revogar"
        onConfirm={() => removeTarget && removeMutation.mutate(removeTarget.id)}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}

/** Montado só enquanto aberto, para o valor da chave não sobreviver ao fechamento. */
function CreateApiKeyDialog({ isAdmin, onClose }: { isAdmin: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [userId, setUserId] = useState('');
  const { data: users } = useQuery({ queryKey: queryKeys.users, queryFn: listUsers, enabled: isAdmin });

  const mutation = useMutation({
    mutationFn: () => createApiKey({ name: name.trim(), userId: userId || undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys }),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  const inputClass = 'mb-3 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100';

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content
          aria-describedby={undefined}
          // Um clique fora não pode descartar a chave recém-criada, que só aparece uma vez.
          onInteractOutside={(e) => e.preventDefault()}
          className="fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-800 bg-slate-900 p-5 shadow-xl"
        >
          <Dialog.Title className="mb-4 text-sm font-semibold text-slate-100">
            {mutation.data ? 'Chave criada' : 'Criar chave'}
          </Dialog.Title>
          {mutation.data ? (
            <>
              <p className="mb-3 text-xs text-slate-400">
                Copie agora: ela não será mostrada de novo. No claude.ai, em Configurações &gt; Connectors &gt;
                Adicionar connector personalizado, use "Sem login" e:
              </p>
              <pre className="mb-3 select-all whitespace-pre-wrap break-all rounded-md border border-slate-700 bg-slate-950 p-3 text-xs text-slate-100">
                {`URL: ${API_BASE_URL}/mcp\nCabeçalho: Authorization = Bearer ${mutation.data.token}`}
              </pre>
              <p className="mb-3 text-xs text-slate-400">
                Ou, no Claude Code (se as chaves não estiverem restritas aos IPs da Anthropic):
              </p>
              <pre className="mb-3 select-all whitespace-pre-wrap break-all rounded-md border border-slate-700 bg-slate-950 p-3 text-xs text-slate-100">
                {`claude mcp add --scope user --transport http projetoio ${API_BASE_URL}/mcp --header "Authorization: Bearer ${mutation.data.token}"`}
              </pre>
              <div className="flex justify-end">
                <Button onClick={onClose}>Já copiei</Button>
              </div>
            </>
          ) : (
            <form onSubmit={onSubmit}>
              <label htmlFor="api-key-name" className="mb-1 block text-xs text-slate-400">
                Nome
              </label>
              <input
                id="api-key-name"
                required
                maxLength={60}
                placeholder="Claude Code"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
              {isAdmin && (
                <>
                  <label htmlFor="api-key-user" className="mb-1 block text-xs text-slate-400">
                    Usuário (recomendado: Senior)
                  </label>
                  <select
                    id="api-key-user"
                    required
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Selecione</option>
                    {users
                      ?.filter((u) => u.isActive && u.globalRole !== 'ADMIN')
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({u.globalRole})
                        </option>
                      ))}
                  </select>
                </>
              )}
              {mutation.isError && (
                <p className="mb-3 text-sm text-red-400">
                  {(mutation.error as any)?.response?.data?.message || 'Falha ao criar a chave'}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Criando...' : 'Criar'}
                </Button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
