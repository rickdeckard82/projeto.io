import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { fetchMe, login as loginApi, logout as logoutApi, register as registerApi } from '../api/auth';
import { socket } from '../lib/socket';
import { User } from '../types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<{ message: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const me = await fetchMe();
      setUser(me);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, []);

  // Conecta o WebSocket de tempo real (RealtimeGateway) só enquanto há sessão autenticada — o
  // handshake carrega o cookie access_token; sem usuário, não há token válido para autenticar.
  useEffect(() => {
    if (user) {
      socket.connect();
    } else {
      socket.disconnect();
    }
  }, [user]);

  const login = async (email: string, password: string) => {
    await loginApi({ email, password });
    await refreshUser();
  };

  const register = async (email: string, password: string, fullName: string) => {
    // Cadastro não inicia sessão automaticamente: a conta só fica utilizável depois de
    // confirmada por e-mail (ver AuthService.register no backend).
    return registerApi({ email, password, fullName });
  };

  const logout = async () => {
    await logoutApi();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
