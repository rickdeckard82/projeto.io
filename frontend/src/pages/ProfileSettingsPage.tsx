import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { updateUser } from '../api/users';
import { Button } from '../components/common/Button';
import { Avatar } from '../components/common/Avatar';

export function ProfileSettingsPage() {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () => updateUser(user!.id, { fullName, avatarUrl }),
    onSuccess: async () => {
      await refreshUser();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  if (!user) return null;

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-slate-100">Perfil</h1>
      <form onSubmit={onSubmit} className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <div className="mb-6 flex items-center gap-4">
          <Avatar name={fullName || user.fullName} src={avatarUrl} email={user.email} size={64} />
          <div>
            <div className="mb-1 text-xs text-slate-500">{user.globalRole}</div>
            <label className="mb-1 block text-xs text-slate-400">URL da imagem</label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://exemplo.com/foto.jpg"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-64 rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100"
              />
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  className="text-xs text-slate-500 hover:text-slate-300"
                >
                  Remover
                </button>
              )}
            </div>
          </div>
        </div>

        <label className="mb-1 block text-xs text-slate-400">E-mail</label>
        <input
          type="email"
          value={user.email}
          disabled
          className="mb-4 w-full rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-500"
        />

        <label className="mb-1 block text-xs text-slate-400">Nome completo</label>
        <input
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="mb-4 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />

        {mutation.isError && <p className="mb-3 text-sm text-red-400">Falha ao salvar alterações.</p>}
        {success && <p className="mb-3 text-sm text-emerald-400">Alterações salvas.</p>}

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </form>
    </div>
  );
}
