import { StatusCategory } from '@prisma/client';

export const DEFAULT_STATUSES: { name: string; category: StatusCategory; position: number }[] = [
  { name: 'Backlog', category: StatusCategory.BACKLOG, position: 0 },
  { name: 'Todo', category: StatusCategory.UNSTARTED, position: 1 },
  { name: 'In Progress', category: StatusCategory.STARTED, position: 2 },
  { name: 'Done', category: StatusCategory.COMPLETED, position: 3 },
  { name: 'Cancelled', category: StatusCategory.CANCELLED, position: 4 },
];
