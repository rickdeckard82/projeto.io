import { apiClient } from './client';
import { AppNotification, NotificationPreferences } from '../types';

export async function listNotifications(params?: {
  cursor?: string;
  limit?: number;
  onlyUnread?: boolean;
}): Promise<{ items: AppNotification[]; nextCursor: string | null }> {
  const res = await apiClient.get('/notifications', { params });
  return res.data;
}

export async function getUnreadCount(): Promise<{ count: number }> {
  const res = await apiClient.get('/notifications/unread-count');
  return res.data;
}

export async function markNotificationRead(id: string): Promise<AppNotification> {
  const res = await apiClient.patch(`/notifications/${id}/read`);
  return res.data;
}

export async function markAllNotificationsRead(): Promise<{ count: number }> {
  const res = await apiClient.post('/notifications/read-all');
  return res.data;
}

export async function clearAllNotifications(): Promise<{ count: number }> {
  const res = await apiClient.delete('/notifications');
  return res.data;
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const res = await apiClient.get('/notifications/preferences');
  return res.data;
}

export interface UpdateNotificationPreferencesInput {
  emailEnabled?: boolean;
  telegramEnabled?: boolean;
  webhookEnabled?: boolean;
  pushoverEnabled?: boolean;
  telegramChatId?: string;
  webhookUrl?: string;
  pushoverUserKey?: string;
}

export async function updateNotificationPreferences(
  data: UpdateNotificationPreferencesInput,
): Promise<NotificationPreferences> {
  const res = await apiClient.patch('/notifications/preferences', data);
  return res.data;
}

export async function testTelegramNotification(): Promise<{ message: string }> {
  const res = await apiClient.post('/notifications/preferences/test-telegram');
  return res.data;
}

export async function testWebhookNotification(): Promise<{ message: string }> {
  const res = await apiClient.post('/notifications/preferences/test-webhook');
  return res.data;
}

export async function testPushoverNotification(): Promise<{ message: string }> {
  const res = await apiClient.post('/notifications/preferences/test-pushover');
  return res.data;
}
