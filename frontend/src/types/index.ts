export type GlobalRole = 'ADMIN' | 'MEMBER' | 'VIEWER';

export type StatusCategory = 'BACKLOG' | 'UNSTARTED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';

export type Priority = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
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
  createdBy: User;
  createdAt: string;
  updatedAt: string;
  assignees: { user: User }[];
  labels: { label: Label }[];
  subItems: WorkItem[];
}

export type ActivityType =
  | 'CREATED'
  | 'TITLE_CHANGED'
  | 'DESCRIPTION_CHANGED'
  | 'STATUS_CHANGED'
  | 'PRIORITY_CHANGED'
  | 'LABEL_ADDED'
  | 'LABEL_REMOVED'
  | 'ASSIGNEE_ADDED'
  | 'ASSIGNEE_REMOVED'
  | 'COMMENT';

export interface ItemActivity {
  id: string;
  workItemId: string;
  userId: string;
  type: ActivityType;
  message: string | null;
  metadata: Record<string, string | null | undefined> | null;
  createdAt: string;
  user: Pick<User, 'id' | 'fullName' | 'avatarUrl'>;
}

export interface RecentWorkItem extends WorkItem {
  project: { id: string; name: string };
}

export interface AllowedDomain {
  id: string;
  domain: string;
  createdAt: string;
}

export interface SmtpSettings {
  host: string;
  port: number;
  useSsl: boolean;
  fromEmail: string;
  authUser: string;
  hasPassword: boolean;
  updatedAt: string;
}

export interface PrivacySettings {
  controllerName: string | null;
  controllerDocument: string | null;
  dpoName: string | null;
  dpoEmail: string | null;
  retentionNotice: string | null;
  additionalNotes: string | null;
  updatedAt: string;
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
