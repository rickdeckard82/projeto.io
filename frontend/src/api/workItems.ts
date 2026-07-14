import { apiClient } from './client';
import { Priority, RecentWorkItem, WorkItem } from '../types';

export interface ItemFilters {
  statusId?: string;
  assigneeId?: string;
  labelId?: string;
  parentId?: string;
}

export async function listItems(projectId: string, filters: ItemFilters = {}): Promise<WorkItem[]> {
  const res = await apiClient.get(`/projects/${projectId}/items`, { params: filters });
  return res.data;
}

export interface CreateItemInput {
  title: string;
  description?: string;
  statusId?: string;
  priority?: Priority;
  parentId?: string;
  startDate?: string;
  dueDate?: string;
}

export async function createItem(projectId: string, data: CreateItemInput): Promise<WorkItem> {
  const res = await apiClient.post(`/projects/${projectId}/items`, data);
  return res.data;
}

export async function getItem(id: string): Promise<WorkItem> {
  const res = await apiClient.get(`/items/${id}`);
  return res.data;
}

export async function updateItem(id: string, data: Partial<CreateItemInput>): Promise<WorkItem> {
  const res = await apiClient.patch(`/items/${id}`, data);
  return res.data;
}

export async function updateItemStatus(id: string, statusId: string): Promise<WorkItem> {
  const res = await apiClient.patch(`/items/${id}/status`, { statusId });
  return res.data;
}

export async function updateItemAssignees(id: string, userIds: string[]): Promise<WorkItem> {
  const res = await apiClient.patch(`/items/${id}/assignees`, { userIds });
  return res.data;
}

export async function updateItemLabels(id: string, labelIds: string[]): Promise<WorkItem> {
  const res = await apiClient.patch(`/items/${id}/labels`, { labelIds });
  return res.data;
}

export async function deleteItem(id: string): Promise<void> {
  await apiClient.delete(`/items/${id}`);
}

export async function getRecentItems(limit = 10): Promise<RecentWorkItem[]> {
  const res = await apiClient.get('/me/recent-items', { params: { limit } });
  return res.data;
}
