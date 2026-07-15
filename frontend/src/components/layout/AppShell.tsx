import { Outlet, useLocation } from 'react-router-dom';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { SettingsSidebar } from './SettingsSidebar';

export function AppShell() {
  const location = useLocation();
  const isSettings = location.pathname.startsWith('/settings');

  return (
    <div className="flex h-screen flex-col">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        {isSettings ? <SettingsSidebar /> : <Sidebar />}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
