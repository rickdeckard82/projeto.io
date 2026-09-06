import { Body, Controller, Get, Patch } from '@nestjs/common';
import { GlobalRole } from '../generated/prisma/client.js';
import { PrivacySettingsService } from './privacy-settings.service.js';
import { UpdatePrivacySettingsDto } from './dto/update-privacy-settings.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { ClientInfo } from '../common/decorators/client-info.decorator.js';
import { AuditService, AuditClientInfo } from '../audit/audit.service.js';
import { AUDIT_ACTIONS } from '../audit/audit-actions.js';

/**
 * Controller REST para a configuração de privacidade/LGPD (`/settings/privacy`), singleton.
 * `GET` é público (`@Public()`): o conteúdo não é sensível — é usado tanto pelo formulário
 * de edição do admin quanto pela página pública de Política de Privacidade, acessível mesmo
 * sem login. Só `PATCH` é restrito a administradores.
 */
@Controller('settings/privacy')
export class PrivacySettingsController {
  constructor(
    private readonly privacySettingsService: PrivacySettingsService,
    private readonly auditService: AuditService,
  ) {}

  @Public()
  @Get()
  get() {
    return this.privacySettingsService.get();
  }

  @Roles(GlobalRole.ADMIN)
  @Patch()
  async update(
    @Body() dto: UpdatePrivacySettingsDto,
    @CurrentUser() actor: AuthenticatedUser,
    @ClientInfo() client: AuditClientInfo,
  ) {
    const result = await this.privacySettingsService.update(dto);
    await this.auditService.record({
      action: AUDIT_ACTIONS.PRIVACY_SETTINGS_UPDATED,
      actorId: actor.id,
      actorLabel: actor.email,
      targetType: 'privacy_settings',
      ip: client.ip,
      userAgent: client.userAgent,
      metadata: { fields: Object.keys(dto) },
    });
    return result;
  }
}
