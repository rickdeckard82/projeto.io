import { Controller, Get, Query } from '@nestjs/common';
import { GlobalRole } from '../generated/prisma/client.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { AuditService } from './audit.service.js';

/**
 * Leitura da trilha de auditoria — restrita a `ADMIN` (`@Roles`). Só leitura: não há rota para
 * criar/editar/apagar registro, nem pela API nem pela UI.
 */
@Controller('audit-logs')
@Roles(GlobalRole.ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Lista os eventos, mais recentes primeiro, paginado por cursor.
   * @param limit - máximo de itens (1–100, padrão 50)
   * @param cursor - id do último item da página anterior
   * @param action - filtra por ação exata (ex.: `auth.login.failed`)
   * @param actorId - filtra por autor
   */
  @Get()
  list(
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
  ) {
    const parsed = limit ? parseInt(limit, 10) : 50;
    return this.auditService.list({
      limit: Number.isFinite(parsed) ? parsed : 50,
      cursor: cursor || undefined,
      action: action || undefined,
      actorId: actorId || undefined,
    });
  }
}
