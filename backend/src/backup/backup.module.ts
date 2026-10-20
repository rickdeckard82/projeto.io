import { Module } from '@nestjs/common';
import { BackupSettingsController } from './backup-settings.controller.js';
import { BackupSettingsService } from './backup-settings.service.js';
import { BackupRunnerService } from './backup-runner.service.js';

/** Backup automático do banco por FTP: configuração (`/settings/backup`) e agendador. */
@Module({
  controllers: [BackupSettingsController],
  providers: [BackupSettingsService, BackupRunnerService],
})
export class BackupModule {}
