import axios from 'axios';

/** URL base da API backend; pode ser sobrescrita via variável de ambiente `VITE_API_BASE_URL` (ex.: em produção/staging), com fallback para o servidor local de desenvolvimento. */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

/** Instância única do axios usada por todos os módulos de `api/*`, configurada com a base URL da aplicação e `withCredentials` para enviar/receber os cookies httpOnly de autenticação (`access_token`/`refresh_token`) em toda requisição. */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Flag e fila usadas pelo interceptor abaixo para evitar disparar múltiplos refreshes de token
// em paralelo quando várias requisições falham com 401 ao mesmo tempo.
let isRefreshing = false;
let pendingQueue: (() => void)[] = [];

/**
 * Interceptor de resposta que implementa o fluxo de renovação automática de sessão: ao receber um 401, tenta um `POST /auth/refresh` (que troca o refresh token pelo cookie de access token) e, se der certo, repete (replay) a requisição original que falhou — tudo de forma transparente para quem chamou.
 *
 * Detalhes do fluxo:
 * - Chamadas para `/auth/*` (login, refresh, logout) são ignoradas propositalmente: um 401 nelas normalmente significa que o refresh token também é inválido, então tentar renovar geraria um loop.
 * - `config._retry` evita retentativa infinita: se a requisição já foi reenviada uma vez após um refresh e voltou a falhar com 401, o erro é propagado normalmente.
 * - Se um refresh já está em andamento (`isRefreshing`), requisições 401 concorrentes não disparam um novo refresh; elas só entram na `pendingQueue` e ficam pendentes até o refresh em curso terminar, quando então são todas reenviadas (replay) via `apiClient(config)`.
 * - Se o refresh falha, a fila é descartada e o erro original de refresh é propagado para todas as chamadas que esperavam por ele.
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (response?.status !== 401 || config._retry || config.url?.includes('/auth/')) {
      return Promise.reject(error);
    }

    config._retry = true;

    if (isRefreshing) {
      return new Promise((resolve) => {
        pendingQueue.push(() => resolve(apiClient(config)));
      });
    }

    isRefreshing = true;
    try {
      await apiClient.post('/auth/refresh');
      pendingQueue.forEach((fn) => fn());
      pendingQueue = [];
      return apiClient(config);
    } catch (refreshError) {
      pendingQueue = [];
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
