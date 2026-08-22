import { Body, Controller, Get, Patch } from '@nestjs/common';
import { GlobalRole } from '../generated/prisma/client.js';
import { PushoverSettingsService } from './pushover-settings.service.js';
import { UpdatePushoverSettingsDto } from './dto/update-pushover-settings.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';

/** Controller REST para a configuração da aplicação Pushover (`/settings/pushover`), singleton, restrito a administradores. */
@Controller('settings/pushover')
export class PushoverSettingsController {
  constructor(private readonly pushoverSettingsService: PushoverSettingsService) {}

  @Roles(GlobalRole.ADMIN)
  @Get()
  get() {
    return this.pushoverSettingsService.get();
  }

  @Roles(GlobalRole.ADMIN)
  @Patch()
  update(@Body() dto: UpdatePushoverSettingsDto) {
    return this.pushoverSettingsService.update(dto);
  }
}
