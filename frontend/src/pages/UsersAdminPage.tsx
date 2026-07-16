import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { anonymizeUser, createUser, deactivateUser, listUsers, updateUserRole } from '../api/users';
import { queryKeys } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { GlobalRole, User } from '../types';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Spinner } from '../components/common/Spinner';

const ROLE_OPTIONS: GlobalRole[] = ['ADMIN', 'SENIOR', 'MEMBER', 'VIEWER'];

export function UsersAdminPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useQuery({ queryKey: queryKeys.users, queryFn: listUsers });
  const [createOpen, setCreateOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null);
  const [anonymizeTarget, setAnonymizeTarget] = useState<User | null>(null);

  const roleMutation = useMutation({
    mutationFn: ({ id, globalRole }: { id: string; globalRole: GlobalRole }) => updateUserRole(id, globalRole),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
      setDeactivateTarget(null);
    },
  });

  const anonymizeMutation = useMutation({
    mutationFn: (id: string) => anonymizeUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
      setAnonymizeTarget(null);
    },
  });

  if (currentUser && currentUser.globalRole !== 'ADMIN') {
    return <Navigate to="/settings/profile" replace />;
  }

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-100">Usuários</h1>
        <Button onClick={() => setCreateOpen(true)}>Novo usuário</Button>
      </div>

      <ul className="divide-y divide-slate-800 rounded-md border border-slate-800">
        {users?.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="flex items-center gap-2">
              <Avatar name={u.fullName} src={u.avatarUrl} />
              <div>
                <p className="text-sm text-slate-200">
                  {u.fullName} {u.id === currentUser?.id && <span className="text-slate-600">(você)</span>}
                </p>
                <p className="text-xs text-slate-500">{u.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {u.isActive === false && <Badge color="#7f1d1d">Inativo</Badge>}
              <select
                value={u.globalRole}
                disabled={u.id === currentUser?.id}
                onChange={(e) => roleMutation.mutate({ id: u.id, globalRole: e.target.value as GlobalRole })}
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 disabled:opacity-50"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                disabled={u.id === currentUser?.id || u.isActive === false}
                onClick={() => setDeactivateTarget(u)}
              >
                Desativar
              </Button>
              <Button variant="ghost" disabled={u.id === currentUser?.id} onClick={() => setAnonymizeTarget(u)}>
                Anonimizar
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />

      <ConfirmDialog
        open={!!deactivateTarget}
        title="Desativar usuário"
        description={`${deactivateTarget?.fullName} não poderá mais entrar no sistema. Essa ação não pode ser desfeita por aqui.`}
        confirmLabel="Desativar"
        onConfirm={() => deactivateTarget && deactivateMutation.mutate(deactivateTarget.id)}
        onCancel={() => setDeactivateTarget(null)}
      />

      <ConfirmDialog
        open={!!anonymizeTarget}
        title="Anonimizar usuário"
        description={`O nome, e-mail, avatar e senha de ${anonymizeTarget?.fullName} serão apagados permanentemente (LGPD — direito de eliminação). O registro é mantido apenas para preservar o histórico de tarefas e documentos já criados por essa pessoa, mas sem nenhum dado pessoal. Essa ação NÃO pode ser desfeita.`}
        confirmLabel="Anonimizar"
        onConfirm={() => anonymizeTarget && anonymizeMutation.mutate(anonymizeTarget.id)}
        onCancel={() => setAnonymizeTarget(null)}
      />
    </div>
  );
}

function CreateUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [globalRole, setGlobalRole] = useState<GlobalRole>('MEMBER');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => createUser({ fullName, email, password, avatarUrl, globalRole }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
      onOpenChange(false);
      setFullName('');
      setEmail('');
      setPassword('');
      setAvatarUrl('');
      setGlobalRole('MEMBER');
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'Falha ao criar usuário');
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
          <Dialog.Title className="mb-4 text-sm font-semibold text-slate-100">Novo usuário</Dialog.Title>
          <form onSubmit={onSubmit}>
            <label className="mb-1 block text-xs text-slate-400">Nome completo</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mb-3 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />

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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-3 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />

            <label className="mb-1 block text-xs text-slate-400">URL da imagem (opcional)</label>
            <input
              type="url"
              placeholder="https://exemplo.com/foto.jpg"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="mb-3 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />

            <label className="mb-1 block text-xs text-slate-400">Papel</label>
            <select
              value={globalRole}
              onChange={(e) => setGlobalRole(e.target.value as GlobalRole)}
              className="mb-4 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>

            {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Criando...' : 'Criar usuário'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
