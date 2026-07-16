import { apiClient } from './client';
import { SmtpSettings } from '../types';

export interface UpdateSmtpSettingsInput {
  host: string;
  port: number;
  useSsl: boolean;
  fromEmail: string;
  authUser: string;
  authPass?: string;
}

export async function getSmtpSettings(): Promise<SmtpSettings | null> {
  const res = await apiClient.get('/settings/smtp');
  return res.data;
}

export async function updateSmtpSettings(data: UpdateSmtpSettingsInput): Promise<SmtpSettings> {
  const res = await apiClient.patch('/settings/smtp', data);
  return res.data;
}
