import { apiClient } from './client';
import { SessionTokens } from '../lib/session';
import { User } from '../types';

/** Resposta de `POST /auth/login` em modo mobile: tokens direto, ou desafio de 2FA. */
export type LoginResult = SessionTokens | { requiresTwoFactor: true; challengeToken: string };

export async function login(data: { email: string; password: string }, turnstileToken?: string | null): Promise<LoginResult> {
  const res = await apiClient.post('/auth/login', data, {
    headers: turnstileToken ? { 'X-Turnstile-Token': turnstileToken } : undefined,
  });
  return res.data;
}

export async function verifyTwoFactor(data: {
  challengeToken: string;
  code: string;
  rememberDevice?: boolean;
}): Promise<SessionTokens & { deviceToken?: string }> {
  const res = await apiClient.post('/auth/2fa/verify', data);
  return res.data;
}

export async function logout(refreshToken: string) {
  await apiClient.post('/auth/logout', { refreshToken });
}

export async function fetchMe(): Promise<User> {
  const res = await apiClient.get('/auth/me');
  return res.data;
}
