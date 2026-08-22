import { Link, NavLink } from 'react-router-dom';
import { Bell, Globe, Home, Lock, Mail, Send, Shield, Smartphone, User as UserIcon, Users } from 'lucide-react';
import { RoleGate } from '../../auth/RoleGate';
import { APP_VERSION } from '../../lib/appInfo';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
    isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
  }`;

function SectionLabel({ children }: { children: string }) {
  return <p className="mb-1 mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-slate-600">{children}</p>;
}

export function SettingsSidebar() {
  return (
    <aside className="thin-scrollbar hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-slate-800 sm:flex">
      <nav className="flex flex-1 flex-col gap-1 p-3">
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
        <NavLink to="/settings/notifications" className={navLinkClass}>
          <Bell size={16} />
          Notificações
        </NavLink>

        <RoleGate allow={['ADMIN']}>
          <SectionLabel>Administração</SectionLabel>
          <NavLink to="/settings/users" className={navLinkClass}>
            <Users size={16} />
            Usuários
          </NavLink>
          <NavLink to="/settings/allowed-domains" className={navLinkClass}>
            <Globe size={16} />
            Domínios permitidos
          </NavLink>
          <NavLink to="/settings/smtp" className={navLinkClass}>
            <Mail size={16} />
            E-mail (SMTP)
          </NavLink>
          <NavLink to="/settings/telegram" className={navLinkClass}>
            <Send size={16} />
            Telegram
          </NavLink>
          <NavLink to="/settings/pushover" className={navLinkClass}>
            <Smartphone size={16} />
            Pushover
          </NavLink>
          <NavLink to="/settings/privacy" className={navLinkClass}>
            <Shield size={16} />
            Privacidade (LGPD)
          </NavLink>
        </RoleGate>
      </nav>

      <footer className="px-3 py-3 text-center text-[11px] text-slate-600">
        Pulsar © 2026 Projeto.io •{' '}
        <Link to="/changelog" className="hover:text-slate-400">
          v{APP_VERSION}
        </Link>
        <br />
        <Link to="/privacidade" target="_blank" className="hover:text-slate-400">
          Política de Privacidade
        </Link>
      </footer>
    </aside>
  );
}
