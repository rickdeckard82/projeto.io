import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { Avatar } from '../common/Avatar';
import { BarWaves } from '../common/BarWaves';
import { NotificationBell } from './NotificationBell';
import logo from '../../assets/projeto-io-logo.svg';

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="relative flex h-14 shrink-0 items-center justify-between border-b border-slate-800 px-4">
      <BarWaves />
      {/* No mobile o menu lateral vira gaveta: botão pra abrir + logo aqui (no desktop o logo fica no menu). */}
      <div className="relative z-10 flex items-center gap-2 sm:hidden">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Abrir menu"
          className="-ml-1 rounded-md p-2 text-slate-300 hover:bg-slate-800"
        >
          <Menu size={20} />
        </button>
        <img src={logo} alt="Projeto.io" className="h-9 w-auto" />
      </div>
      {user && (
        <div className="relative z-10 ml-auto flex items-center gap-2">
          <NotificationBell />
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-slate-400 outline-none hover:bg-slate-800"
              >
                <Avatar name={user.fullName} src={user.avatarUrl} />
                <span>{user.fullName}</span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="w-56 rounded-md border border-slate-800 bg-slate-900 py-1 shadow-xl"
              >
                <div className="px-3 py-2 text-xs text-slate-500">{user.email}</div>
                <DropdownMenu.Separator className="my-1 h-px bg-slate-800" />
                <DropdownMenu.Item
                  onSelect={() => navigate('/settings')}
                  className="cursor-pointer px-3 py-2 text-sm text-slate-200 outline-none hover:bg-slate-800"
                >
                  Configurações
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => logout()}
                  className="cursor-pointer px-3 py-2 text-sm text-red-400 outline-none hover:bg-slate-800"
                >
                  Sair
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      )}
    </header>
  );
}
