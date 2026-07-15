import { NavLink } from 'react-router-dom';
import { Home, Lock, User as UserIcon, Users } from 'lucide-react';
import { RoleGate } from '../../auth/RoleGate';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
    isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
  }`;

function SectionLabel({ children }: { children: string }) {
  return <p className="mb-1 mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-slate-600">{children}</p>;
}

export function SettingsSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-slate-800 p-3 sm:block">
      <nav className="flex flex-col gap-1">
        <NavLink to="/" end className={navLinkClass}>
          <Home size={16} />
          Página inicial
        </NavLink>

        <SectionLabel>Configurações</SectionLabel>
        <NavLink to="/settings/profile" className={navLinkClass}>
          <UserIcon size={16} />
          Perfil
        </NavLink>
        <NavLink to="/settings/security" className={navLinkClass}>
          <Lock size={16} />
          Segurança
        </NavLink>

        <RoleGate allow={['ADMIN']}>
          <SectionLabel>Administração</SectionLabel>
          <NavLink to="/settings/users" className={navLinkClass}>
            <Users size={16} />
            Usuários
          </NavLink>
        </RoleGate>
      </nav>
    </aside>
  );
}
