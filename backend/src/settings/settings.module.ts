import { Module } from '@nestjs/common';
import { AllowedDomainsController } from './allowed-domains.controller';
import { AllowedDomainsService } from './allowed-domains.service';
import { SmtpSettingsController } from './smtp-settings.controller';
import { SmtpSettingsService } from './smtp-settings.service';

@Module({
  controllers: [AllowedDomainsController, SmtpSettingsController],
  providers: [AllowedDomainsService, SmtpSettingsService],
  exports: [AllowedDomainsService, SmtpSettingsService],
})
export class SettingsModule {}
