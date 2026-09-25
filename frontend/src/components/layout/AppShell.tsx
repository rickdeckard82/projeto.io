import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { SettingsSidebar } from './SettingsSidebar';
import { AppFooter } from './AppFooter';

const SIDEBAR_COLLAPSED_KEY = 'pm_sidebar_collapsed';

export function AppShell() {
  const location = useLocation();
  const isSettings = location.pathname.startsWith('/settings');

  // Menu lateral recolhido (só ícones) — preferência lembrada entre sessões neste navegador.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
      /* modo privado / storage bloqueado */
    }
  }, [collapsed]);

  const toggleCollapsed = () => setCollapsed((v) => !v);

  // Gaveta do menu no mobile: fecha sozinha ao navegar para outra rota.
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Dentro da gaveta mobile o menu aparece sempre expandido, mesmo que no desktop esteja recolhido.
  const sidebarProps = { collapsed: collapsed && !mobileOpen, onToggleCollapsed: toggleCollapsed, mobileOpen };

  return (
    // Menu lateral em altura total (com o logo no topo); Topbar e rodapé ficam só sobre a coluna de conteúdo.
    <div className="flex h-screen overflow-hidden">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm sm:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      {isSettings ? <SettingsSidebar {...sidebarProps} /> : <Sidebar {...sidebarProps} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={() => setMobileOpen(true)} />
        <main className="thin-scrollbar flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
        <AppFooter />
      </div>
    </div>
  );
}
