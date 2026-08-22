import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { NotificationPreferencesService } from './preferences.service.js';
import { UpdatePreferencesDto } from './dto/update-preferences.dto.js';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

/** Controller REST das preferências de notificação (`/notifications/preferences`) do próprio usuário autenticado. */
@Controller('notifications/preferences')
export class NotificationPreferencesController {
  constructor(private readonly preferencesService: NotificationPreferencesService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.preferencesService.get(user.id);
  }

  @Patch()
  update(@Body() dto: UpdatePreferencesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.preferencesService.update(user.id, dto);
  }

  @Post('test-telegram')
  testTelegram(@CurrentUser() user: AuthenticatedUser) {
    return this.preferencesService.testTelegram(user.id);
  }

  @Post('test-webhook')
  testWebhook(@CurrentUser() user: AuthenticatedUser) {
    return this.preferencesService.testWebhook(user.id);
  }

  @Post('test-pushover')
  testPushover(@CurrentUser() user: AuthenticatedUser) {
    return this.preferencesService.testPushover(user.id);
  }
}
