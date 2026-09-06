/**
 * Nomes canônicos das ações registradas na trilha de auditoria (`AuditLog.action`), no formato
 * `dominio.evento`. Manter aqui centralizado para os consumidores (filtros do frontend,
 * relatórios) terem uma lista única de referência.
 */
export const AUDIT_ACTIONS = {
  LOGIN_SUCCEEDED: 'auth.login.succeeded',
  LOGIN_FAILED: 'auth.login.failed',
  LOGOUT: 'auth.logout',
  TWO_FACTOR_ENABLED: 'auth.2fa.enabled',
  TWO_FACTOR_DISABLED: 'auth.2fa.disabled',
  PASSWORD_CHANGED: 'user.password_changed',
  USER_CREATED: 'user.created',
  USER_ROLE_CHANGED: 'user.role_changed',
  USER_DEACTIVATED: 'user.deactivated',
  USER_ANONYMIZED: 'user.anonymized',
  ALLOWED_DOMAIN_ADDED: 'settings.allowed_domain.added',
  ALLOWED_DOMAIN_REMOVED: 'settings.allowed_domain.removed',
  SMTP_SETTINGS_UPDATED: 'settings.smtp.updated',
  PRIVACY_SETTINGS_UPDATED: 'settings.privacy.updated',
} as const;

export type AuditActionValue = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
