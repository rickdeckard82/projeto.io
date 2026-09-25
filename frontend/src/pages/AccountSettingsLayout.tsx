import { Outlet } from 'react-router-dom';

/** Coluna centralizada das páginas de `/settings`, com a mesma largura da página inicial (`HomePage`). */
export function AccountSettingsLayout() {
  return (
    <div className="mx-auto max-w-3xl">
      <Outlet />
    </div>
  );
}
