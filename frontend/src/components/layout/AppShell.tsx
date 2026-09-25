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

  return (
    // Menu lateral em altura total (com o logo no topo); Topbar e rodapé ficam só sobre a coluna de conteúdo.
    <div className="flex h-screen overflow-hidden">
      {isSettings ? (
        <SettingsSidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      ) : (
        <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="thin-scrollbar flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
        <AppFooter />
      </div>
    </div>
  );
}
