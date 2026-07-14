import { ReactNode } from 'react';
import { GlobalRole } from '../types';
import { useAuth } from './AuthContext';

export function RoleGate({ allow, children }: { allow: GlobalRole[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user || !allow.includes(user.globalRole)) {
    return null;
  }
  return <>{children}</>;
}
