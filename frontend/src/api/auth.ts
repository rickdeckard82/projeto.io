import { apiClient } from './client';
import { User } from '../types';

export interface LoginResult {
  message?: string;
  requiresTwoFactor?: true;
  challengeToken?: string;
}

/** Header com o token do Cloudflare Turnstile, quando há um (senão a request vai sem — backend libera). */
function turnstileConfig(token?: string | null) {
  return token ? { headers: { 'X-Turnstile-Token': token } } : undefined;
}

export async function register(
  data: { email: string; password: string; fullName: string },
  turnstileToken?: string | null,
) {
  const res = await apiClient.post('/auth/register', data, turnstileConfig(turnstileToken));
  return res.data;
}

export async function login(
  data: { email: string; password: string },
  turnstileToken?: string | null,
): Promise<LoginResult> {
  const res = await apiClient.post('/auth/login', data, turnstileConfig(turnstileToken));
  return res.data;
}

export async function verifyTwoFactor(data: { challengeToken: string; code: string; rememberDevice?: boolean }) {
  const res = await apiClient.post('/auth/2fa/verify', data);
  return res.data;
}

export async function forgetTrustedDevices() {
  const res = await apiClient.post('/auth/2fa/trusted-devices/forget');
  return res.data;
}

export interface TrustedDevice {
  id: string;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export async function listTrustedDevices(): Promise<TrustedDevice[]> {
  const res = await apiClient.get('/auth/2fa/trusted-devices');
  return res.data;
}

export async function revokeTrustedDevice(id: string) {
  const res = await apiClient.delete(`/auth/2fa/trusted-devices/${id}`);
  return res.data;
}

export async function setupTwoFactor(): Promise<{ qrCodeDataUrl: string; secret: string }> {
  const res = await apiClient.post('/auth/2fa/setup');
  return res.data;
}

export async function enableTwoFactor(code: string): Promise<{ message: string; recoveryCodes: string[] }> {
  const res = await apiClient.post('/auth/2fa/enable', { code });
  return res.data;
}

export async function disableTwoFactor(password: string) {
  const res = await apiClient.post('/auth/2fa/disable', { password });
  return res.data;
}

export async function logout() {
  const res = await apiClient.post('/auth/logout');
  return res.data;
}

export async function fetchMe(): Promise<User> {
  const res = await apiClient.get('/auth/me');
  return res.data;
}

export async function verifyEmail(token: string) {
  const res = await apiClient.get('/auth/verify-email', { params: { token } });
  return res.data;
}

export async function resendVerification(email: string) {
  const res = await apiClient.post('/auth/resend-verification', { email });
  return res.data;
}
