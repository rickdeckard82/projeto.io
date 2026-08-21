import { Module } from '@nestjs/common';
import { AllowedDomainsController } from './allowed-domains.controller.js';
import { AllowedDomainsService } from './allowed-domains.service.js';
import { SmtpSettingsController } from './smtp-settings.controller.js';
import { SmtpSettingsService } from './smtp-settings.service.js';
import { PrivacySettingsController } from './privacy-settings.controller.js';
import { PrivacySettingsService } from './privacy-settings.service.js';
import { TelegramSettingsController } from './telegram-settings.controller.js';
import { TelegramSettingsService } from './telegram-settings.service.js';

@Module({
  controllers: [AllowedDomainsController, SmtpSettingsController, PrivacySettingsController, TelegramSettingsController],
  providers: [AllowedDomainsService, SmtpSettingsService, PrivacySettingsService, TelegramSettingsService],
  exports: [AllowedDomainsService, SmtpSettingsService, PrivacySettingsService, TelegramSettingsService],
})
export class SettingsModule {}
