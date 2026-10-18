import * as SecureStore from 'expo-secure-store';

const SERVER_URL_KEY = 'projetoio.serverUrl';
const ACCESS_TOKEN_KEY = 'projetoio.accessToken';
const REFRESH_TOKEN_KEY = 'projetoio.refreshToken';
const DEVICE_TOKEN_KEY = 'projetoio.deviceToken';

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Cópia em memória do que está no SecureStore — o interceptor do axios lê o access token a cada
 * request, e ir no armazenamento nativo toda vez seria lento. Carregada uma vez por
 * {@link loadSession} no início do app; toda escrita atualiza as duas coisas juntas.
 */
const state: { serverUrl: string | null; tokens: SessionTokens | null; deviceToken: string | null } = {
  serverUrl: null,
  tokens: null,
  deviceToken: null,
};

/**
 * Normaliza o endereço digitado: assume `https://` quando falta o esquema, remove barra final e o
 * `/api/v1` se o usuário colou a URL da API em vez da do site.
 */
export function normalizeServerUrl(url: string): string {
  let value = url.trim().replace(/\/+$/, '').replace(/\/api\/v1$/, '');
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  return value;
}

export async function loadSession() {
  const [serverUrl, accessToken, refreshToken, deviceToken] = await Promise.all([
    SecureStore.getItemAsync(SERVER_URL_KEY),
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.getItemAsync(DEVICE_TOKEN_KEY),
  ]);
  state.serverUrl = serverUrl;
  state.tokens = accessToken && refreshToken ? { accessToken, refreshToken } : null;
  state.deviceToken = deviceToken;
}

/**
 * Servidor escolhido pelo usuário no primeiro acesso — não há padrão embutido, porque cada
 * organização hospeda o seu Projeto.io e o endereço pode mudar. `null` até ser informado.
 */
export const getServerUrl = () => state.serverUrl;
export const getTokens = () => state.tokens;
export const getDeviceToken = () => state.deviceToken;

/** Grava um endereço já normalizado (ver {@link normalizeServerUrl}). */
export async function setServerUrl(url: string) {
  state.serverUrl = url;
  await SecureStore.setItemAsync(SERVER_URL_KEY, url);
}

export async function setTokens(tokens: SessionTokens) {
  state.tokens = tokens;
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function clearTokens() {
  state.tokens = null;
  await Promise.all([SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY), SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)]);
}

/** Token de "lembrar este dispositivo" do 2FA (30 dias) — sobrevive ao logout, igual ao cookie do web. */
export async function setDeviceToken(token: string) {
  state.deviceToken = token;
  await SecureStore.setItemAsync(DEVICE_TOKEN_KEY, token);
}
