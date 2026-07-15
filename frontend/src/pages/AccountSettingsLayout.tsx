import { Outlet } from 'react-router-dom';

export function AccountSettingsLayout() {
  return (
    <div className="max-w-2xl">
      <Outlet />
    </div>
  );
}
