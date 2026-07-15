import { StatusCategory } from '@prisma/client';

/**
 * As 5 colunas padrão do kanban, semeadas automaticamente para todo novo projeto por
 * `ProjectsService.create` (via `statuses: { createMany: { data: DEFAULT_STATUSES } } }`).
 * Cada entrada define o nome exibido, a categoria usada para agrupar/relatar progresso
 * (`BACKLOG` / `UNSTARTED` / `STARTED` / `COMPLETED` / `CANCELLED`) e a posição de exibição
 * inicial na coluna do quadro.
 */
export const DEFAULT_STATUSES: { name: string; category: StatusCategory; position: number }[] = [
  { name: 'Backlog', category: StatusCategory.BACKLOG, position: 0 },
  { name: 'Todo', category: StatusCategory.UNSTARTED, position: 1 },
  { name: 'In Progress', category: StatusCategory.STARTED, position: 2 },
  { name: 'Done', category: StatusCategory.COMPLETED, position: 3 },
  { name: 'Cancelled', category: StatusCategory.CANCELLED, position: 4 },
];
