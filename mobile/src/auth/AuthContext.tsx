import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import * as authApi from '../api/auth';
import { setOnSessionExpired } from '../api/client';
import { connectSocket, disconnectSocket } from '../lib/realtime';
import { clearTokens, getTokens, loadSession, SessionTokens, setDeviceToken, setTokens } from '../lib/session';
import { User } from '../types';

/** Resultado de {@link AuthContextValue.login}: sessão iniciada, ou falta o código do 2FA. */
export type LoginOutcome = { status: 'ok' } | { status: 'twoFactor'; challengeToken: string };

interface AuthContextValue {
  /** `true` enquanto lê o SecureStore e valida a sessão salva na abertura do app. */
  initializing: boolean;
  user: User | null;
  login: (email: string, password: string, turnstileToken?: string | null) => Promise<LoginOutcome>;
  verifyTwoFactor: (challengeToken: string, code: string, rememberDevice: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Equivalente mobile do `frontend/src/auth/AuthContext.tsx`: guarda o usuário logado e concentra o
 * fluxo de login (com 2FA) e logout. Na abertura, carrega os tokens do SecureStore e valida com
 * `GET /auth/me` (o interceptor renova o access token se ele já tiver expirado).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const resetSession = useCallback(() => {
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setOnSessionExpired(resetSession);
    return () => setOnSessionExpired(null);
  }, [resetSession]);

  // Tempo real acompanha a sessão: conecta ao logar, derruba ao sair (igual ao AuthContext web).
  useEffect(() => {
    if (user) connectSocket();
    else disconnectSocket();
  }, [user]);

  useEffect(() => {
    (async () => {
      try {
        await loadSession();
        if (getTokens()) {
          setUser(await authApi.fetchMe());
        }
      } catch (error) {
        // Sem rede: mantém os tokens para tentar de novo na próxima abertura; 401 já limpou a sessão.
        if (axios.isAxiosError(error) && error.response?.status === 401) await clearTokens();
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  const startSession = useCallback(async (tokens: SessionTokens) => {
    await setTokens(tokens);
    setUser(await authApi.fetchMe());
  }, []);

  const login = useCallback<AuthContextValue['login']>(
    async (email, password, turnstileToken) => {
      const result = await authApi.login({ email, password }, turnstileToken);
      if ('requiresTwoFactor' in result) {
        return { status: 'twoFactor', challengeToken: result.challengeToken };
      }
      await startSession(result);
      return { status: 'ok' };
    },
    [startSession],
  );

  const verifyTwoFactor = useCallback<AuthContextValue['verifyTwoFactor']>(
    async (challengeToken, code, rememberDevice) => {
      const { deviceToken, ...tokens } = await authApi.verifyTwoFactor({ challengeToken, code, rememberDevice });
      if (deviceToken) await setDeviceToken(deviceToken);
      await startSession(tokens);
    },
    [startSession],
  );

  const logout = useCallback(async () => {
    const tokens = getTokens();
    try {
      if (tokens) await authApi.logout(tokens.refreshToken);
    } catch {
      // Revogar no servidor é "melhor esforço" — sair do app tem que funcionar mesmo offline.
    }
    await clearTokens();
    resetSession();
  }, [resetSession]);

  const value = useMemo(
    () => ({ initializing, user, login, verifyTwoFactor, logout }),
    [initializing, user, login, verifyTwoFactor, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
