export const queryKeys = {
  me: ['me'] as const,
  recentItems: ['me', 'recent-items'] as const,
  users: ['users'] as const,
  projects: (archived = false) => ['projects', { archived }] as const,
  project: (id: string) => ['projects', id] as const,
  projectMembers: (id: string) => ['projects', id, 'members'] as const,
  projectStatuses: (id: string) => ['projects', id, 'statuses'] as const,
  projectLabels: (id: string) => ['projects', id, 'labels'] as const,
  projectItems: (id: string, filters?: Record<string, string | undefined>) =>
    ['projects', id, 'items', filters] as const,
  item: (id: string) => ['items', id] as const,
  projectDocuments: (id: string) => ['projects', id, 'documents'] as const,
  document: (id: string) => ['documents', id] as const,
};
