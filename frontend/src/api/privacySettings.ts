import { apiClient } from './client';
import { PrivacySettings } from '../types';

export interface UpdatePrivacySettingsInput {
  controllerName?: string;
  controllerDocument?: string;
  dpoName?: string;
  dpoEmail?: string;
  retentionNotice?: string;
  additionalNotes?: string;
}

export async function getPrivacySettings(): Promise<PrivacySettings | null> {
  const res = await apiClient.get('/settings/privacy');
  return res.data;
}

export async function updatePrivacySettings(data: UpdatePrivacySettingsInput): Promise<PrivacySettings> {
  const res = await apiClient.patch('/settings/privacy', data);
  return res.data;
}
