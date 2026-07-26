import { apiClient } from './client';
import { GlobalRole, User, UserDirectoryEntry } from '../types';

/** Lista completa de usuários (inclui e-mail). Restrita a Admin — para seletores de pessoa, use `listUserDirectory`. */
export async function listUsers(): Promise<User[]> {
  const res = await apiClient.get('/users');
  return res.data;
}

/** Lista mínima de usuários (id, nome, avatar — sem e-mail) para seletores de pessoa. Aberta a qualquer usuário autenticado. */
export async function listUserDirectory(): Promise<UserDirectoryEntry[]> {
  const res = await apiClient.get('/users/directory');
  return res.data;
}

export async function updateUserRole(id: string, globalRole: GlobalRole): Promise<User> {
  const res = await apiClient.patch(`/users/${id}/role`, { globalRole });
  return res.data;
}

export async function deactivateUser(id: string): Promise<User> {
  const res = await apiClient.patch(`/users/${id}/deactivate`);
  return res.data;
}

export async function anonymizeUser(id: string): Promise<User> {
  const res = await apiClient.patch(`/users/${id}/anonymize`);
  return res.data;
}

export async function exportMyData(): Promise<unknown> {
  const res = await apiClient.get('/users/me/export');
  return res.data;
}

export async function updateUser(
  id: string,
  data: { fullName?: string; avatarUrl?: string; password?: string; timezone?: string },
): Promise<User> {
  const res = await apiClient.patch(`/users/${id}`, data);
  return res.data;
}

export async function createUser(data: {
  fullName: string;
  email: string;
  password: string;
  avatarUrl?: string;
  globalRole?: GlobalRole;
}): Promise<User> {
  const res = await apiClient.post('/users', data);
  return res.data;
}
