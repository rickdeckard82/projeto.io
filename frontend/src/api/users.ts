import { apiClient } from './client';
import { GlobalRole, User } from '../types';

export async function listUsers(): Promise<User[]> {
  const res = await apiClient.get('/users');
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

export async function updateUser(
  id: string,
  data: { fullName?: string; avatarUrl?: string; password?: string },
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
