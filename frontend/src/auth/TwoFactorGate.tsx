import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * Bloqueia o app inteiro para contas `ADMIN` que ainda não ativaram o 2FA obrigatório,
 * redirecionando-as para `/setup-2fa` até configurarem. A regra de verdade é do backend
 * (`TwoFactorEnforcedGuard`) — isto é só o espelho na navegação, para a pessoa não bater numa
 * sequência de telas quebradas por 403. Usado como elemento de rota em volta do `AppShell`.
 */
export function TwoFactorGate() {
  const { user } = useAuth();

  if (user && user.globalRole === 'ADMIN' && !user.twoFactorEnabled) {
    return <Navigate to="/setup-2fa" replace />;
  }

  return <Outlet />;
}
