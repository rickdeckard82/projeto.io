import { apiClient } from './client';
import { User } from '../types';

export async function register(data: { email: string; password: string; fullName: string }) {
  const res = await apiClient.post('/auth/register', data);
  return res.data;
}

export async function login(data: { email: string; password: string }) {
  const res = await apiClient.post('/auth/login', data);
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
