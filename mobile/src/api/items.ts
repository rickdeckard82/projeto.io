import { apiClient } from './client';
import { ItemActivity, Priority, WorkItem } from '../types';

export interface CreateItemInput {
  title: string;
  description?: string;
  statusId?: string;
  priority?: Priority;
}

export async function createItem(projectId: string, data: CreateItemInput): Promise<WorkItem> {
  const res = await apiClient.post(`/projects/${projectId}/items`, data);
  return res.data;
}

export async function getItem(id: string): Promise<WorkItem> {
  const res = await apiClient.get(`/items/${id}`);
  return res.data;
}

export async function updateItem(
  id: string,
  data: Partial<Pick<WorkItem, 'title' | 'priority'>> & { description?: string },
): Promise<WorkItem> {
  const res = await apiClient.patch(`/items/${id}`, data);
  return res.data;
}

export async function updateItemStatus(id: string, statusId: string): Promise<WorkItem> {
  const res = await apiClient.patch(`/items/${id}/status`, { statusId });
  return res.data;
}

export async function getItemActivities(id: string): Promise<ItemActivity[]> {
  const res = await apiClient.get(`/items/${id}/activities`);
  return res.data;
}

export async function addItemComment(id: string, message: string): Promise<ItemActivity> {
  const res = await apiClient.post(`/items/${id}/comments`, { message });
  return res.data;
}
