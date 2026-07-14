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
