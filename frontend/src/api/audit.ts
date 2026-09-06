import { apiClient } from './client';

export interface AuditLogEntry {
  id: string;
  action: string;
  actorId: string | null;
  actorLabel: string | null;
  targetType: string | null;
  targetId: string | null;
  ip: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogPageResult {
  items: AuditLogEntry[];
  nextCursor: string | null;
}

/** Rótulos legíveis para `AuditLogEntry.action` — mesma lista de `backend/src/audit/audit-actions.ts`. */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  'auth.login.succeeded': 'Login bem-sucedido',
  'auth.login.failed': 'Login falhou',
  'auth.logout': 'Logout',
  'auth.2fa.enabled': '2FA ativado',
  'auth.2fa.disabled': '2FA desativado',
  'user.password_changed': 'Senha alterada',
  'user.created': 'Usuário criado',
  'user.role_changed': 'Papel alterado',
  'user.deactivated': 'Usuário desativado',
  'user.anonymized': 'Usuário anonimizado',
  'settings.allowed_domain.added': 'Domínio permitido adicionado',
  'settings.allowed_domain.removed': 'Domínio permitido removido',
  'settings.smtp.updated': 'E-mail (SMTP) atualizado',
  'settings.privacy.updated': 'Privacidade (LGPD) atualizada',
};

export async function listAuditLogs(params: {
  limit?: number;
  cursor?: string;
  action?: string;
  actorId?: string;
}): Promise<AuditLogPageResult> {
  const res = await apiClient.get('/audit-logs', { params });
  return res.data;
}
