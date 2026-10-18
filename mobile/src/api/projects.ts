import { apiClient } from './client';
import { Project, Status, WorkItem } from '../types';

export async function listProjects(archived = false): Promise<Project[]> {
  const res = await apiClient.get('/projects', { params: { archived } });
  return res.data;
}

export async function getProject(id: string): Promise<Project> {
  const res = await apiClient.get(`/projects/${id}`);
  return res.data;
}

export async function listStatuses(projectId: string): Promise<Status[]> {
  const res = await apiClient.get(`/projects/${projectId}/statuses`);
  return res.data;
}

export async function listItems(projectId: string): Promise<WorkItem[]> {
  const res = await apiClient.get(`/projects/${projectId}/items`);
  return res.data;
}
