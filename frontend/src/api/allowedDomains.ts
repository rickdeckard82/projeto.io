import { apiClient } from './client';
import { AllowedDomain } from '../types';

export async function listAllowedDomains(): Promise<AllowedDomain[]> {
  const res = await apiClient.get('/settings/allowed-domains');
  return res.data;
}

export async function createAllowedDomain(domain: string): Promise<AllowedDomain> {
  const res = await apiClient.post('/settings/allowed-domains', { domain });
  return res.data;
}

export async function deleteAllowedDomain(id: string): Promise<void> {
  await apiClient.delete(`/settings/allowed-domains/${id}`);
}
