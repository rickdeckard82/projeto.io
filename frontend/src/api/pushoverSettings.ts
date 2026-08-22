import { apiClient } from './client';
import { PushoverSettings } from '../types';

export interface UpdatePushoverSettingsInput {
  apiToken?: string;
}

export async function getPushoverSettings(): Promise<PushoverSettings | null> {
  const res = await apiClient.get('/settings/pushover');
  return res.data;
}

export async function updatePushoverSettings(data: UpdatePushoverSettingsInput): Promise<PushoverSettings> {
  const res = await apiClient.patch('/settings/pushover', data);
  return res.data;
}
