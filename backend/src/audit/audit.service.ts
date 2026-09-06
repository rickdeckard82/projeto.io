import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditActionValue } from './audit-actions.js';

/** Dados de origem da requisição, resolvidos pelo `@ClientInfo()` param decorator. */
export interface AuditClientInfo {
  ip: string | null;
  userAgent: string | null;
}

export interface AuditEntry {
  action: AuditActionValue;
  actorId?: string | null;
  actorLabel?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue | null;
}

/**
 * Grava eventos de segurança e administrativos em `audit_logs`. Uma falha de gravação **nunca**
 * propaga: a auditoria não pode derrubar a operação de negócio que a disparou — a falha só vai
 * para o log da aplicação. Registrado como provider global (`AuditModule` é `@Global()`), então
 * qualquer módulo injeta `AuditService` sem importar nada.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: entry.action,
          actorId: entry.actorId ?? null,
          actorLabel: entry.actorLabel ?? null,
          targetType: entry.targetType ?? null,
          targetId: entry.targetId ?? null,
          ip: entry.ip ?? null,
          userAgent: entry.userAgent ?? null,
          metadata: entry.metadata ?? Prisma.JsonNull,
        },
      });
    } catch (err) {
      this.logger.error(
        `Falha ao gravar audit log (action=${entry.action})`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  /**
   * Lista paginada por cursor (id), mais recentes primeiro. Filtros opcionais por `action` e
   * `actorId`. Usada pela tela de administração em `/settings/audit`.
   */
  async list(params: { limit: number; cursor?: string; action?: string; actorId?: string }) {
    const take = Math.min(Math.max(params.limit, 1), 100);
    const where: Prisma.AuditLogWhereInput = {};
    if (params.action) {
      where.action = params.action;
    }
    if (params.actorId) {
      where.actorId = params.actorId;
    }

    const rows = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
  }
}
