import { Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

/**
 * Controller REST do sino de notificações (`/notifications`) — cada usuário só lê/marca as
 * próprias notificações, sem `@Roles()` (qualquer usuário autenticado já passa).
 */
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('onlyUnread') onlyUnread?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.notificationsService.list(user.id, {
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      cursor,
      onlyUnread: onlyUnread === 'true',
    });
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return { count: await this.notificationsService.countUnread(user.id) };
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markRead(id, user);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllRead(user);
  }

  @Delete()
  deleteAll(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.deleteAll(user);
  }
}
