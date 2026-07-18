import { apiClient } from './client';
import { ProjectMetrics } from '../types';

export async function getProjectMetrics(projectId: string): Promise<ProjectMetrics> {
  const res = await apiClient.get(`/projects/${projectId}/metrics`);
  return res.data;
}
