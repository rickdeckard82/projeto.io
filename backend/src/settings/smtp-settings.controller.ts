import { Body, Controller, Get, Patch } from '@nestjs/common';
import { GlobalRole } from '../generated/prisma/client.js';
import { SmtpSettingsService } from './smtp-settings.service.js';
import { UpdateSmtpSettingsDto } from './dto/update-smtp-settings.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { ClientInfo } from '../common/decorators/client-info.decorator.js';
import { AuditService, AuditClientInfo } from '../audit/audit.service.js';
import { AUDIT_ACTIONS } from '../audit/audit-actions.js';

/** Controller REST para a configuração de SMTP (`/settings/smtp`), singleton, restrito a administradores. */
@Controller('settings/smtp')
export class SmtpSettingsController {
  constructor(
    private readonly smtpSettingsService: SmtpSettingsService,
    private readonly auditService: AuditService,
  ) {}

  @Roles(GlobalRole.ADMIN)
  @Get()
  get() {
    return this.smtpSettingsService.get();
  }

  @Roles(GlobalRole.ADMIN)
  @Patch()
  async update(
    @Body() dto: UpdateSmtpSettingsDto,
    @CurrentUser() actor: AuthenticatedUser,
    @ClientInfo() client: AuditClientInfo,
  ) {
    const result = await this.smtpSettingsService.update(dto);
    // Só o host/porta/remetente/usuário no metadata — nunca a senha.
    await this.auditService.record({
      action: AUDIT_ACTIONS.SMTP_SETTINGS_UPDATED,
      actorId: actor.id,
      actorLabel: actor.email,
      targetType: 'smtp_settings',
      ip: client.ip,
      userAgent: client.userAgent,
      metadata: { host: dto.host, port: dto.port, fromEmail: dto.fromEmail, authUser: dto.authUser },
    });
    return result;
  }
}
