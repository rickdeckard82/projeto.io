import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service.js';
import { CreateApiKeyDto } from './dto/create-api-key.dto.js';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { ClientInfo } from '../common/decorators/client-info.decorator.js';
import { AuditService, AuditClientInfo } from '../audit/audit.service.js';
import { AUDIT_ACTIONS, AuditActionValue } from '../audit/audit-actions.js';

/** Gestão de chaves de API (`/api-keys`). Só com sessão normal: nenhuma rota leva `@AllowApiKey()`. */
@Controller('api-keys')
export class ApiKeysController {
  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.apiKeysService.list(user);
  }

  @Post()
  async create(
    @Body() dto: CreateApiKeyDto,
    @CurrentUser() actor: AuthenticatedUser,
    @ClientInfo() client: AuditClientInfo,
  ) {
    const key = await this.apiKeysService.create(dto, actor);
    await this.audit(AUDIT_ACTIONS.API_KEY_CREATED, key, actor, client);
    return key;
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @ClientInfo() client: AuditClientInfo,
  ) {
    const key = await this.apiKeysService.remove(id, actor);
    await this.audit(AUDIT_ACTIONS.API_KEY_REVOKED, key, actor, client);
    return { message: 'Chave revogada' };
  }

  private audit(
    action: AuditActionValue,
    key: { id: string; prefix: string; user: { id: string } },
    actor: AuthenticatedUser,
    client: AuditClientInfo,
  ) {
    return this.auditService.record({
      action,
      actorId: actor.id,
      actorLabel: actor.email,
      targetType: 'api_key',
      targetId: key.id,
      ip: client.ip,
      userAgent: client.userAgent,
      metadata: { prefix: key.prefix, ownerId: key.user.id },
    });
  }
}
