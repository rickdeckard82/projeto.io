import { apiClient } from './client';
import { ApiKey } from '../types';

export async function listApiKeys(): Promise<ApiKey[]> {
  const res = await apiClient.get('/api-keys');
  return res.data;
}

/** `token` é o valor bruto da chave, devolvido só nesta resposta. `userId` só é aceito de Admin. */
export async function createApiKey(data: { name: string; userId?: string }): Promise<ApiKey & { token: string }> {
  const res = await apiClient.post('/api-keys', data);
  return res.data;
}

export async function deleteApiKey(id: string): Promise<void> {
  await apiClient.delete(`/api-keys/${id}`);
}
