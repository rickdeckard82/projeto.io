// Subconjunto de `frontend/src/types/index.ts` — mesmo contrato da API. Ao mudar um shape no
// backend, atualize os dois lados.

export type GlobalRole = 'ADMIN' | 'SENIOR' | 'MEMBER' | 'VIEWER';

export type StatusCategory = 'BACKLOG' | 'UNSTARTED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';

export type Priority = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type RecurrenceUnit = 'DAY' | 'WEEK' | 'MONTH';

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  globalRole: GlobalRole;
  twoFactorEnabled?: boolean;
  timezone?: string;
}

export interface Project {
  id: string;
  name: string;
  key: string | null;
  icon: string | null;
  coverColor: string | null;
  isPublic: boolean;
  description: string | null;
  ownerId: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Status {
  id: string;
  projectId: string;
  name: string;
  category: StatusCategory;
  position: number;
}

export interface Label {
  id: string;
  projectId: string;
  name: string;
  color: string;
}

export interface WorkItem {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  statusId: string;
  status: Status;
  priority: Priority;
  parentId: string | null;
  moduleId: string | null;
  module: { id: string; name: string } | null;
  startDate: string | null;
  dueDate: string | null;
  createdById: string;
  statusLockedById: string | null;
  recurrenceUnit: RecurrenceUnit | null;
  recurrenceInterval: number | null;
  createdAt: string;
  updatedAt: string;
  assignees: { user: Pick<User, 'id' | 'fullName' | 'avatarUrl'> }[];
  labels: { label: Label }[];
}
