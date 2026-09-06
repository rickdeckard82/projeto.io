import { apiClient } from './client';
import { ItemActivity, Priority, RecentWorkItem, RecurrenceUnit, WorkItem } from '../types';

export interface ItemFilters {
  statusId?: string;
  assigneeId?: string;
  labelId?: string;
  moduleId?: string;
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
  moduleId?: string;
  startDate?: string;
  dueDate?: string;
  reminderAt?: string;
  reminderOffsetMinutes?: number;
  recurrenceUnit?: RecurrenceUnit;
  recurrenceInterval?: number;
}

export async function createItem(projectId: string, data: CreateItemInput): Promise<WorkItem> {
  const res = await apiClient.post(`/projects/${projectId}/items`, data);
  return res.data;
}

export async function getItem(id: string): Promise<WorkItem> {
  const res = await apiClient.get(`/items/${id}`);
  return res.data;
}

/** Igual a `CreateItemInput`, mas com recorrência e lembrete aceitando `null` explícito para limpá-los. */
export type UpdateItemInput = Partial<
  Omit<CreateItemInput, 'recurrenceUnit' | 'recurrenceInterval' | 'reminderAt' | 'reminderOffsetMinutes'>
> & {
  recurrenceUnit?: RecurrenceUnit | null;
  recurrenceInterval?: number | null;
  /** `true` marca esta ocorrência como a última da série (concluí-la não gera a próxima). */
  recurrenceEndsHere?: boolean;
  reminderAt?: string | null;
  reminderOffsetMinutes?: number | null;
};

export async function updateItem(id: string, data: UpdateItemInput): Promise<WorkItem> {
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

export async function getItemActivities(id: string): Promise<ItemActivity[]> {
  const res = await apiClient.get(`/items/${id}/activities`);
  return res.data;
}

export async function addItemComment(id: string, message: string): Promise<ItemActivity> {
  const res = await apiClient.post(`/items/${id}/comments`, { message });
  return res.data;
}

export async function getRecentItems(limit = 10, sortBy: 'dueDate' | 'priority' = 'dueDate'): Promise<RecentWorkItem[]> {
  const res = await apiClient.get('/me/recent-items', { params: { limit, sortBy } });
  return res.data;
}
