import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { clearTokens, getDeviceToken, getServerUrl, getTokens, SessionTokens, setTokens } from '../lib/session';

/**
 * Instância única do axios do app. Diferente do frontend web (cookies httpOnly), aqui a sessão é
 * por token: todo request leva `X-Client-Type: mobile` — que faz o backend devolver/aceitar os
 * tokens no corpo (ver `backend/src/auth/mobile-client.util.ts`) — e `Authorization: Bearer`.
 * A base URL é lida a cada request porque o servidor é escolhido na tela de login.
 */
export const apiClient = axios.create({ timeout: 20_000 });

apiClient.interceptors.request.use((config) => {
  const serverUrl = getServerUrl();
  if (!serverUrl) throw new Error('Servidor não configurado');
  config.baseURL = `${serverUrl}/api/v1`;
  config.headers.set('X-Client-Type', 'mobile');
  const tokens = getTokens();
  if (tokens && !config.headers.has('Authorization')) {
    config.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }
  const deviceToken = getDeviceToken();
  if (deviceToken) {
    config.headers.set('X-Device-Token', deviceToken);
  }
  return config;
});

/** Chamado quando a sessão não pode mais ser renovada — o `AuthContext` registra aqui o "voltar ao login". */
let onSessionExpired: (() => void) | null = null;
export function setOnSessionExpired(handler: (() => void) | null) {
  onSessionExpired = handler;
}

// Um único refresh em voo por vez: vários 401 simultâneos esperam a mesma promise, em vez de cada
// um rotacionar o refresh token (o segundo falharia, porque o primeiro já revogou o token antigo).
let refreshPromise: Promise<SessionTokens> | null = null;

async function refreshTokens(): Promise<SessionTokens> {
  const tokens = getTokens();
  if (!tokens) throw new Error('Sem sessão');
  const res = await axios.post<SessionTokens>(
    `${getServerUrl()}/api/v1/auth/refresh`,
    { refreshToken: tokens.refreshToken },
    { headers: { 'X-Client-Type': 'mobile' }, timeout: 20_000 },
  );
  await setTokens(res.data);
  return res.data;
}

/** Rotas em que um 401 é resposta final (credencial errada etc.), não "access token expirado". */
const NO_REFRESH_ROUTES = ['/auth/login', '/auth/refresh', '/auth/2fa/verify', '/auth/logout'];

/**
 * Em qualquer 401 (exceto em {@link NO_REFRESH_ROUTES}), renova o par de tokens e repete o request
 * original uma vez. Se a renovação falhar com 401 (refresh expirado/revogado), limpa a sessão e
 * avisa o `AuthContext`; falha de rede no refresh não derruba a sessão.
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (!config || error.response?.status !== 401 || config._retry || NO_REFRESH_ROUTES.some((r) => config.url?.startsWith(r))) {
      return Promise.reject(error);
    }
    if (!getTokens()) return Promise.reject(error);

    config._retry = true;
    try {
      refreshPromise ??= refreshTokens().finally(() => {
        refreshPromise = null;
      });
      const tokens = await refreshPromise;
      config.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
      return apiClient(config);
    } catch (refreshError) {
      if (axios.isAxiosError(refreshError) && refreshError.response?.status === 401) {
        await clearTokens();
        onSessionExpired?.();
      }
      return Promise.reject(refreshError);
    }
  },
);

/**
 * Confere se o endereço responde como um Projeto.io (`GET /api/v1/health` → `{ status: 'ok' }`)
 * antes de gravá-lo — pega erro de digitação no primeiro acesso, em vez de só falhar no login.
 */
export async function checkServer(serverUrl: string): Promise<boolean> {
  try {
    const res = await axios.get(`${serverUrl}/api/v1/health`, { timeout: 10_000 });
    return res.data?.status === 'ok';
  } catch {
    return false;
  }
}

/** Mensagem legível de um erro da API (formato do `HttpExceptionFilter`: `{ message, code? }`). */
export function errorMessage(error: unknown, fallback = 'Algo deu errado. Tente de novo.'): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Não foi possível falar com o servidor. Verifique a conexão e o endereço.';
    const message = (error.response.data as { message?: string | string[] } | undefined)?.message;
    if (Array.isArray(message)) return message.join('\n');
    if (message) return message;
  }
  return fallback;
}

/** `code` legível por máquina da resposta de erro (ex.: `TURNSTILE_REQUIRED`, `TWO_FACTOR_REQUIRED`). */
export function errorCode(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) return undefined;
  return (error.response?.data as { code?: string } | undefined)?.code;
}
