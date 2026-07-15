import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { updateUser } from '../api/users';
import { Button } from '../components/common/Button';

export function SecuritySettingsPage() {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () => updateUser(user!.id, { password }),
    onSuccess: () => {
      setPassword('');
      setConfirmPassword('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    mutation.mutate();
  };

  if (!user) return null;

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-slate-100">Segurança</h1>
      <form onSubmit={onSubmit} className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-200">Alterar senha</h2>

        <label className="mb-1 block text-xs text-slate-400">Nova senha</label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />

        <label className="mb-1 block text-xs text-slate-400">Confirmar nova senha</label>
        <input
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mb-4 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        {mutation.isError && <p className="mb-3 text-sm text-red-400">Falha ao alterar a senha.</p>}
        {success && <p className="mb-3 text-sm text-emerald-400">Senha alterada com sucesso.</p>}

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Salvando...' : 'Alterar senha'}
        </Button>
      </form>
    </div>
  );
}
