import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { GlobalRole } from '../generated/prisma/client.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { ClientInfo } from '../common/decorators/client-info.decorator.js';
import { AuditService, AuditClientInfo } from '../audit/audit.service.js';
import { AUDIT_ACTIONS } from '../audit/audit-actions.js';
import { BackupSettingsService } from './backup-settings.service.js';
import { UpdateBackupSettingsDto } from './dto/update-backup-settings.dto.js';

/** Controller REST do backup automático por FTP (`/settings/backup`), singleton, restrito a administradores. */
@Controller('settings/backup')
export class BackupSettingsController {
  constructor(
    private readonly backupSettingsService: BackupSettingsService,
    private readonly auditService: AuditService,
  ) {}

  @Roles(GlobalRole.ADMIN)
  @Get()
  get() {
    return this.backupSettingsService.get();
  }

  @Roles(GlobalRole.ADMIN)
  @Patch()
  async update(
    @Body() dto: UpdateBackupSettingsDto,
    @CurrentUser() actor: AuthenticatedUser,
    @ClientInfo() client: AuditClientInfo,
  ) {
    const result = await this.backupSettingsService.update(dto);
    // Nunca a senha no metadata.
    await this.auditService.record({
      action: AUDIT_ACTIONS.BACKUP_SETTINGS_UPDATED,
      actorId: actor.id,
      actorLabel: actor.email,
      targetType: 'backup_settings',
      ip: client.ip,
      userAgent: client.userAgent,
      metadata: {
        enabled: result.enabled,
        runTime: result.runTime,
        ftpHost: result.ftpHost,
        ftpPort: result.ftpPort,
        ftpUser: result.ftpUser,
        ftpDirectory: result.ftpDirectory,
        ftpTls: result.ftpTls,
        ftpWriteOnly: result.ftpWriteOnly,
      },
    });
    return result;
  }

  @Roles(GlobalRole.ADMIN)
  @Post('test')
  @HttpCode(200)
  test(@Body() dto: UpdateBackupSettingsDto) {
    return this.backupSettingsService.test(dto);
  }

  @Roles(GlobalRole.ADMIN)
  @Post('run')
  @HttpCode(202)
  async run(@CurrentUser() actor: AuthenticatedUser, @ClientInfo() client: AuditClientInfo) {
    const result = await this.backupSettingsService.requestRun();
    await this.auditService.record({
      action: AUDIT_ACTIONS.BACKUP_RUN_REQUESTED,
      actorId: actor.id,
      actorLabel: actor.email,
      targetType: 'backup_settings',
      ip: client.ip,
      userAgent: client.userAgent,
    });
    return result;
  }
}
