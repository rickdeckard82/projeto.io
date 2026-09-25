import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { TwoFactorSetupDialog } from '../components/security/TwoFactorSetupDialog';
import { Button } from '../components/common/Button';
import { AuthWaves } from '../components/common/AuthWaves';
import logo from '../assets/projeto-io-logo.svg';

/**
 * Tela obrigatória mostrada a administradores que ainda não ativaram o 2FA (ver `TwoFactorGate`
 * e, no backend, `TwoFactorEnforcedGuard`). Reaproveita o `TwoFactorSetupDialog` de
 * Configurações → Segurança; ao concluir a ativação, recarrega o usuário e libera o app.
 */
export function TwoFactorRequiredPage() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [setupOpen, setSetupOpen] = useState(false);
  const [justEnabled, setJustEnabled] = useState(false);

  // Só admins sem 2FA veem esta tela — qualquer outro caso volta para a home.
  if (!user || user.globalRole !== 'ADMIN' || user.twoFactorEnabled) {
    return <Navigate to="/" replace />;
  }

  const handleDialogOpenChange = async (open: boolean) => {
    if (open) {
      setSetupOpen(true);
      return;
    }
    setSetupOpen(false);
    if (justEnabled) {
      await refreshUser();
      navigate('/', { replace: true });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative flex h-screen flex-col items-center overflow-hidden">
      <AuthWaves />
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8">
        <img src={logo} alt="Projeto.io" className="h-24 w-auto" />
        <div className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h1 className="mb-2 text-lg font-semibold text-slate-100">Ative a verificação em duas etapas</h1>
          <p className="mb-4 text-sm text-slate-400">
            Contas de administrador precisam de autenticação de dois fatores (2FA) para acessar o sistema.
            Configure agora com um app autenticador (Google Authenticator, Authy, etc.) para continuar.
          </p>
          <Button className="w-full" onClick={() => setSetupOpen(true)}>
            Configurar agora
          </Button>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 w-full text-center text-xs text-slate-500 hover:text-slate-300"
          >
            Sair
          </button>
        </div>
      </div>

      <TwoFactorSetupDialog
        open={setupOpen}
        onOpenChange={handleDialogOpenChange}
        onEnabled={() => setJustEnabled(true)}
      />
    </div>
  );
}
