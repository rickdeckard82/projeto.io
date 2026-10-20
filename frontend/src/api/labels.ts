import { apiClient } from './client';
import { Label } from '../types';

/** Etiquetas são globais: a mesma lista vale para todos os projetos. */
export async function listLabels(): Promise<Label[]> {
  const res = await apiClient.get('/labels');
  return res.data;
}

export async function createLabel(data: { name: string; color: string }): Promise<Label> {
  const res = await apiClient.post('/labels', data);
  return res.data;
}

export async function updateLabel(labelId: string, data: { name?: string; color?: string }): Promise<Label> {
  const res = await apiClient.patch(`/labels/${labelId}`, data);
  return res.data;
}

export async function deleteLabel(labelId: string): Promise<void> {
  await apiClient.delete(`/labels/${labelId}`);
}
