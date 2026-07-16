import { Module } from '@nestjs/common';
import { AllowedDomainsController } from './allowed-domains.controller';
import { AllowedDomainsService } from './allowed-domains.service';
import { SmtpSettingsController } from './smtp-settings.controller';
import { SmtpSettingsService } from './smtp-settings.service';
import { PrivacySettingsController } from './privacy-settings.controller';
import { PrivacySettingsService } from './privacy-settings.service';

@Module({
  controllers: [AllowedDomainsController, SmtpSettingsController, PrivacySettingsController],
  providers: [AllowedDomainsService, SmtpSettingsService, PrivacySettingsService],
  exports: [AllowedDomainsService, SmtpSettingsService, PrivacySettingsService],
})
export class SettingsModule {}
