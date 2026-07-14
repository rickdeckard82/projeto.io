import { apiClient } from './client';
import { Project, ProjectMember, Status } from '../types';

export async function listProjects(archived = false): Promise<Project[]> {
  const res = await apiClient.get('/projects', { params: { archived } });
  return res.data;
}

export async function getProject(id: string): Promise<Project> {
  const res = await apiClient.get(`/projects/${id}`);
  return res.data;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  key?: string;
  icon?: string;
  coverColor?: string;
  isPublic?: boolean;
  ownerId?: string;
}

export async function createProject(data: CreateProjectInput): Promise<Project> {
  const res = await apiClient.post('/projects', data);
  return res.data;
}

export async function updateProject(
  id: string,
  data: Partial<Omit<CreateProjectInput, 'key'>>,
): Promise<Project> {
  const res = await apiClient.patch(`/projects/${id}`, data);
  return res.data;
}

export async function deleteProject(id: string): Promise<void> {
  await apiClient.delete(`/projects/${id}`);
}

export async function archiveProject(id: string): Promise<Project> {
  const res = await apiClient.patch(`/projects/${id}/archive`);
  return res.data;
}

export async function unarchiveProject(id: string): Promise<Project> {
  const res = await apiClient.patch(`/projects/${id}/unarchive`);
  return res.data;
}

export async function listProjectMembers(id: string): Promise<ProjectMember[]> {
  const res = await apiClient.get(`/projects/${id}/members`);
  return res.data;
}

export async function addProjectMember(id: string, userId: string): Promise<ProjectMember> {
  const res = await apiClient.post(`/projects/${id}/members`, { userId });
  return res.data;
}

export async function removeProjectMember(id: string, userId: string): Promise<void> {
  await apiClient.delete(`/projects/${id}/members/${userId}`);
}

export async function listProjectStatuses(id: string): Promise<Status[]> {
  const res = await apiClient.get(`/projects/${id}/statuses`);
  return res.data;
}
