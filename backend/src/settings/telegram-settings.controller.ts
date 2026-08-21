import { Body, Controller, Get, Patch } from '@nestjs/common';
import { GlobalRole } from '../generated/prisma/client.js';
import { TelegramSettingsService } from './telegram-settings.service.js';
import { UpdateTelegramSettingsDto } from './dto/update-telegram-settings.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';

/** Controller REST para a configuração do bot do Telegram (`/settings/telegram`), singleton, restrito a administradores. */
@Controller('settings/telegram')
export class TelegramSettingsController {
  constructor(private readonly telegramSettingsService: TelegramSettingsService) {}

  @Roles(GlobalRole.ADMIN)
  @Get()
  get() {
    return this.telegramSettingsService.get();
  }

  @Roles(GlobalRole.ADMIN)
  @Patch()
  update(@Body() dto: UpdateTelegramSettingsDto) {
    return this.telegramSettingsService.update(dto);
  }
}
