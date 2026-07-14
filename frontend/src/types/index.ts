export type GlobalRole = 'ADMIN' | 'MEMBER' | 'VIEWER';

export type StatusCategory = 'BACKLOG' | 'UNSTARTED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';

export type Priority = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface User {
  id: string;
  email: string;
  fullName: string;
  globalRole: GlobalRole;
  isActive?: boolean;
  createdAt?: string;
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

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  user: User;
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
  startDate: string | null;
  dueDate: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  assignees: { user: User }[];
  labels: { label: Label }[];
  subItems: WorkItem[];
}

export interface RecentWorkItem extends WorkItem {
  project: { id: string; name: string };
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  title: string;
  content: string;
  createdById: string;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
}
