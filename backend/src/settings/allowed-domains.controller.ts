import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { GlobalRole } from '../generated/prisma/client.js';
import { AllowedDomainsService } from './allowed-domains.service.js';
import { CreateAllowedDomainDto } from './dto/create-allowed-domain.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { ClientInfo } from '../common/decorators/client-info.decorator.js';
import { AuditService, AuditClientInfo } from '../audit/audit.service.js';
import { AUDIT_ACTIONS } from '../audit/audit-actions.js';

/**
 * Controller REST para a lista de domínios de e-mail autorizados a se autocadastrar
 * (`/settings/allowed-domains`). Restrito a administradores em todas as rotas — diferente de
 * `UsersController.list()`, essa lista não tem consumidor legítimo além da própria tela de
 * configuração administrativa.
 */
@Controller('settings/allowed-domains')
export class AllowedDomainsController {
  constructor(
    private readonly allowedDomainsService: AllowedDomainsService,
    private readonly auditService: AuditService,
  ) {}

  @Roles(GlobalRole.ADMIN)
  @Get()
  list() {
    return this.allowedDomainsService.list();
  }

  @Roles(GlobalRole.ADMIN)
  @Post()
  async create(
    @Body() dto: CreateAllowedDomainDto,
    @CurrentUser() actor: AuthenticatedUser,
    @ClientInfo() client: AuditClientInfo,
  ) {
    const created = await this.allowedDomainsService.create(dto);
    await this.auditService.record({
      action: AUDIT_ACTIONS.ALLOWED_DOMAIN_ADDED,
      actorId: actor.id,
      actorLabel: actor.email,
      targetType: 'allowed_domain',
      targetId: created.id,
      ip: client.ip,
      userAgent: client.userAgent,
      metadata: { domain: created.domain },
    });
    return created;
  }

  @Roles(GlobalRole.ADMIN)
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @ClientInfo() client: AuditClientInfo,
  ) {
    const result = await this.allowedDomainsService.remove(id);
    await this.auditService.record({
      action: AUDIT_ACTIONS.ALLOWED_DOMAIN_REMOVED,
      actorId: actor.id,
      actorLabel: actor.email,
      targetType: 'allowed_domain',
      targetId: id,
      ip: client.ip,
      userAgent: client.userAgent,
    });
    return result;
  }
}
