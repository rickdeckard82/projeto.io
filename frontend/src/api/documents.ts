import { apiClient } from './client';
import { ProjectDocument } from '../types';

export async function listDocuments(projectId: string): Promise<ProjectDocument[]> {
  const res = await apiClient.get(`/projects/${projectId}/documents`);
  return res.data;
}

export async function createDocument(
  projectId: string,
  data: { title: string; content?: string },
): Promise<ProjectDocument> {
  const res = await apiClient.post(`/projects/${projectId}/documents`, data);
  return res.data;
}

export async function getDocument(id: string): Promise<ProjectDocument> {
  const res = await apiClient.get(`/documents/${id}`);
  return res.data;
}

export async function updateDocument(
  id: string,
  data: { title?: string; content?: string },
): Promise<ProjectDocument> {
  const res = await apiClient.patch(`/documents/${id}`, data);
  return res.data;
}

export async function deleteDocument(id: string): Promise<void> {
  await apiClient.delete(`/documents/${id}`);
}
