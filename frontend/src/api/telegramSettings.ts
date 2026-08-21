import { apiClient } from './client';
import { TelegramSettings } from '../types';

export interface UpdateTelegramSettingsInput {
  botToken?: string;
  botUsername?: string;
}

export async function getTelegramSettings(): Promise<TelegramSettings | null> {
  const res = await apiClient.get('/settings/telegram');
  return res.data;
}

export async function updateTelegramSettings(data: UpdateTelegramSettingsInput): Promise<TelegramSettings> {
  const res = await apiClient.patch('/settings/telegram', data);
  return res.data;
}
