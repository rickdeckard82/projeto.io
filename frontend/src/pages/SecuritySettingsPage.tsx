import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { updateUser } from '../api/users';
import { disableTwoFactor, forgetTrustedDevices } from '../api/auth';
import { Button } from '../components/common/Button';
import { TwoFactorSetupDialog } from '../components/security/TwoFactorSetupDialog';

export function SecuritySettingsPage() {
  const { user, refreshUser } = useAuth();
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

  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableError, setDisableError] = useState<string | null>(null);
  const [disabling, setDisabling] = useState(false);

  const forgetDevicesMutation = useMutation({ mutationFn: forgetTrustedDevices });

  const cancelDisable = () => {
    setDisableOpen(false);
    setDisablePassword('');
    setDisableError(null);
  };

  const onDisable = async (e: FormEvent) => {
    e.preventDefault();
    setDisabling(true);
    setDisableError(null);
    try {
      await disableTwoFactor(disablePassword);
      cancelDisable();
      await refreshUser();
    } catch (err: any) {
      setDisableError(err?.response?.data?.message || 'Não foi possível desativar.');
    } finally {
      setDisabling(false);
    }
  };

  if (!user) return null;

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-slate-100">Segurança</h1>
      <form onSubmit={onSubmit} className="mb-6 rounded-lg border border-slate-800 bg-slate-900 p-6">
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

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-1 text-sm font-semibold text-slate-200">Autenticação de dois fatores</h2>
        <p className="mb-4 text-xs text-slate-400">
          Adiciona uma segunda etapa de verificação (código de um app autenticador, como Google Authenticator ou
          Authy) ao entrar na sua conta.
        </p>

        {user.twoFactorEnabled ? (
          <>
            <p className="mb-3 text-sm text-emerald-400">Ativada</p>
            <div className="mb-4">
              <Button
                type="button"
                variant="secondary"
                disabled={forgetDevicesMutation.isPending}
                onClick={() => forgetDevicesMutation.mutate()}
              >
                {forgetDevicesMutation.isPending ? 'Esquecendo...' : 'Esquecer dispositivos confiáveis'}
              </Button>
              <p className="mt-1 text-xs text-slate-500">
                Volta a pedir o código de verificação em todos os dispositivos que marcaram "lembrar este dispositivo"
                ao entrar.
              </p>
              {forgetDevicesMutation.isSuccess && (
                <p className="mt-1 text-xs text-emerald-400">Dispositivos confiáveis esquecidos.</p>
              )}
            </div>
            {disableOpen ? (
              <form onSubmit={onDisable}>
                <label className="mb-1 block text-xs text-slate-400">Confirme sua senha para desativar</label>
                <input
                  type="password"
                  autoFocus
                  required
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  className="mb-3 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
                {disableError && <p className="mb-3 text-sm text-red-400">{disableError}</p>}
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={cancelDisable}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="danger" disabled={disabling}>
                    {disabling ? 'Desativando...' : 'Confirmar desativação'}
                  </Button>
                </div>
              </form>
            ) : (
              <Button variant="danger" onClick={() => setDisableOpen(true)}>
                Desativar
              </Button>
            )}
          </>
        ) : (
          <Button onClick={() => setSetupOpen(true)}>Ativar</Button>
        )}
      </div>

      <TwoFactorSetupDialog open={setupOpen} onOpenChange={setSetupOpen} onEnabled={refreshUser} />
    </div>
  );
}
