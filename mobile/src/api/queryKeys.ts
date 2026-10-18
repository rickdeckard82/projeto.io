/** Chaves do TanStack Query centralizadas (mesma ideia de `frontend/src/api/queryKeys.ts`). */
export const queryKeys = {
  projects: (archived = false) => ['projects', { archived }] as const,
  project: (id: string) => ['project', id] as const,
  statuses: (projectId: string) => ['statuses', projectId] as const,
  items: (projectId: string) => ['items', projectId] as const,
  item: (id: string) => ['item', id] as const,
  itemActivities: (id: string) => ['item', id, 'activities'] as const,
};
