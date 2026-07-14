import { apiClient } from './client';
import { Label } from '../types';

export async function listLabels(projectId: string): Promise<Label[]> {
  const res = await apiClient.get(`/projects/${projectId}/labels`);
  return res.data;
}

export async function createLabel(
  projectId: string,
  data: { name: string; color: string },
): Promise<Label> {
  const res = await apiClient.post(`/projects/${projectId}/labels`, data);
  return res.data;
}

export async function deleteLabel(labelId: string): Promise<void> {
  await apiClient.delete(`/labels/${labelId}`);
}
