import { Body, Controller, Get, Patch } from '@nestjs/common';
import { GlobalRole } from '../generated/prisma/client.js';
import { SmtpSettingsService } from './smtp-settings.service.js';
import { UpdateSmtpSettingsDto } from './dto/update-smtp-settings.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';

/** Controller REST para a configuração de SMTP (`/settings/smtp`), singleton, restrito a administradores. */
@Controller('settings/smtp')
export class SmtpSettingsController {
  constructor(private readonly smtpSettingsService: SmtpSettingsService) {}

  @Roles(GlobalRole.ADMIN)
  @Get()
  get() {
    return this.smtpSettingsService.get();
  }

  @Roles(GlobalRole.ADMIN)
  @Patch()
  update(@Body() dto: UpdateSmtpSettingsDto) {
    return this.smtpSettingsService.update(dto);
  }
}
