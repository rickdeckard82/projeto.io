import { useAuth } from '../../auth/AuthContext';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';

export function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-800 px-4">
      <div className="text-sm font-semibold text-slate-200">Projeto.io</div>
      {user && (
        <div className="flex items-center gap-3">
          <Avatar name={user.fullName} />
          <div className="text-xs text-slate-400">
            {user.fullName} <span className="text-slate-600">·</span> {user.globalRole}
          </div>
          <Button variant="ghost" onClick={() => logout()}>
            Sair
          </Button>
        </div>
      )}
    </header>
  );
}
