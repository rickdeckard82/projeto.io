import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Bell, Globe, Home, Lock, Mail, ScrollText, Send, Shield, Smartphone, User as UserIcon, Users } from 'lucide-react';
import { RoleGate } from '../../auth/RoleGate';
import { SectionLabel, SidebarCollapseButton, sidebarAsideClass, sidebarLinkClass } from './sidebarShared';

interface SettingsSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function SettingsSidebar({ collapsed, onToggleCollapsed }: SettingsSidebarProps) {
  const linkClass = sidebarLinkClass(collapsed);

  const item = (to: string, Icon: LucideIcon, label: string, end = false) => (
    <NavLink to={to} end={end} className={linkClass} title={collapsed ? label : undefined}>
      <Icon size={16} className="shrink-0" />
      {!collapsed && label}
    </NavLink>
  );

  return (
    <aside className={sidebarAsideClass(collapsed)}>
      <nav className={`flex flex-1 flex-col gap-1 ${collapsed ? 'p-2' : 'p-3'}`}>
        <SidebarCollapseButton collapsed={collapsed} onToggle={onToggleCollapsed} />
        {item('/', Home, 'Página inicial', true)}

        <SectionLabel collapsed={collapsed}>Configurações</SectionLabel>
        {item('/settings/profile', UserIcon, 'Perfil')}
        {item('/settings/security', Lock, 'Segurança')}
        {item('/settings/notifications', Bell, 'Notificações')}

        <RoleGate allow={['ADMIN']}>
          <SectionLabel collapsed={collapsed}>Administração</SectionLabel>
          {item('/settings/users', Users, 'Usuários')}
          {item('/settings/audit', ScrollText, 'Auditoria')}
          {item('/settings/allowed-domains', Globe, 'Domínios permitidos')}
          {item('/settings/smtp', Mail, 'E-mail (SMTP)')}
          {item('/settings/telegram', Send, 'Telegram')}
          {item('/settings/pushover', Smartphone, 'Pushover')}
          {item('/settings/privacy', Shield, 'Privacidade (LGPD)')}
        </RoleGate>
      </nav>
    </aside>
  );
}
