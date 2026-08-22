export type GlobalRole = 'ADMIN' | 'SENIOR' | 'MEMBER' | 'VIEWER';

export type StatusCategory = 'BACKLOG' | 'UNSTARTED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';

export type Priority = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

/** "A cada N dias" (recorrência personalizada) é só `DAY` com `recurrenceInterval` > 1 — não existe unidade "custom" separada, a UI decide como apresentar cada combinação. */
export type RecurrenceUnit = 'DAY' | 'WEEK' | 'MONTH';

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  globalRole: GlobalRole;
  isActive?: boolean;
  createdAt?: string;
  twoFactorEnabled?: boolean;
  /** Fuso horário IANA (ex.: "America/Sao_Paulo") usado para formatar timestamps na UI — ver `lib/dateFormat.ts`. */
  timezone?: string;
}

/** Versão mínima de `User` (sem e-mail) usada pelos seletores de pessoa — ver `GET /users/directory`. */
export interface UserDirectoryEntry {
  id: string;
  fullName: string;
  avatarUrl: string | null;
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

export interface Module {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Shape de um sub-item dentro de `WorkItem.subItems` — o backend traz os sub-itens com um
 * include raso (`subItems: { include: { status: true } }`), então eles não carregam
 * `assignees`/`labels`/`createdBy`/`statusLockedBy`/`subItems` aninhados como o item pai.
 */
export interface WorkItemSummary {
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
  statusLockedById: string | null;
  createdAt: string;
  updatedAt: string;
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
  module: Pick<Module, 'id' | 'name'> | null;
  startDate: string | null;
  dueDate: string | null;
  createdById: string;
  createdBy: User;
  statusLockedById: string | null;
  statusLockedBy: Pick<User, 'id' | 'fullName' | 'avatarUrl'> | null;
  /** Segundos já acumulados em status "Em andamento" (categoria STARTED), consolidados a cada saída dessa categoria. */
  inProgressSeconds: number;
  /** Preenchido enquanto o item estiver em "Em andamento" agora — desde quando, para somar ao `inProgressSeconds` acumulado. */
  inProgressSince: string | null;
  /** Presença = item recorrente; ao ser concluído, o backend gera automaticamente a próxima ocorrência. */
  recurrenceUnit: RecurrenceUnit | null;
  recurrenceInterval: number | null;
  /** Lembrete customizado, sempre resolvido para um instante absoluto pelo backend. */
  reminderAt: string | null;
  /** Presença = lembrete relativo ("N minutos antes do vencimento"), recalculado quando `dueDate` muda; `null` com `reminderAt` preenchido = data/hora absoluta digitada. */
  reminderOffsetMinutes: number | null;
  createdAt: string;
  updatedAt: string;
  assignees: { user: User }[];
  labels: { label: Label }[];
  subItems: WorkItemSummary[];
}

export interface Note {
  id: string;
  content: string;
  color: string | null;
  createdById: string;
  createdBy: Pick<User, 'id' | 'fullName' | 'avatarUrl'>;
  createdAt: string;
  updatedAt: string;
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
  | 'COMMENT'
  | 'RECURRENCE_GENERATED';

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

export interface ProjectMetricsUserStat {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  assigned: number;
  completed: number;
  cancelled: number;
  /** Soma (em horas) do tempo "Em andamento" de todos os itens em que o usuário é responsável — o item inteiro conta para cada responsável, sem dividir entre eles. */
  totalHours: number;
}

export interface ProjectMetricsRecurringTask {
  id: string;
  title: string;
  /** Quantas vezes essa série já se repetiu até chegar neste item (0 = item original, nunca repetiu). */
  recurrenceCount: number;
}

export interface ProjectMetrics {
  totalItems: number;
  byCategory: Record<StatusCategory, number>;
  /** Média (em horas) do tempo real que os itens concluídos passaram em "Em andamento" antes de concluir. */
  avgInProgressHours: number | null;
  /** Soma (em horas) do tempo "Em andamento" de todos os itens do projeto — inclui itens ainda em andamento. */
  totalExecutionHours: number;
  projectDurationDays: number;
  perUser: ProjectMetricsUserStat[];
  /** Tarefas recorrentes ainda ativas (não concluídas/canceladas) no projeto — no máximo uma por série. */
  recurringTasks: {
    count: number;
    /** Soma de quantas vezes cada série já se repetiu. */
    totalOccurrences: number;
    items: ProjectMetricsRecurringTask[];
  };
}

export type NotificationType = 'TASK_DUE_SOON' | 'TASK_OVERDUE' | 'TASK_ASSIGNED' | 'TASK_REMINDER';

/** Renomeado de "Notification" para não colidir com o tipo global `Notification` do DOM. */
export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  telegramEnabled: boolean;
  webhookEnabled: boolean;
  telegramChatId: string | null;
  webhookUrl: string | null;
  hasWebhookSecret: boolean;
  updatedAt: string;
}

export interface TelegramSettings {
  botUsername: string | null;
  hasToken: boolean;
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
