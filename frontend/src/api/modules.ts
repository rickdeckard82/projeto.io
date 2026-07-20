import { apiClient } from './client';
import { Module } from '../types';

export async function listModules(projectId: string): Promise<Module[]> {
  const res = await apiClient.get(`/projects/${projectId}/modules`);
  return res.data;
}

export async function getModule(moduleId: string): Promise<Module> {
  const res = await apiClient.get(`/modules/${moduleId}`);
  return res.data;
}

export interface ModuleInput {
  name: string;
  description?: string;
}

export async function createModule(projectId: string, data: ModuleInput): Promise<Module> {
  const res = await apiClient.post(`/projects/${projectId}/modules`, data);
  return res.data;
}

export async function updateModule(moduleId: string, data: Partial<ModuleInput>): Promise<Module> {
  const res = await apiClient.patch(`/modules/${moduleId}`, data);
  return res.data;
}

export async function deleteModule(moduleId: string): Promise<void> {
  await apiClient.delete(`/modules/${moduleId}`);
}
