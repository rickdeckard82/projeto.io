import { Controller, Get, Query } from '@nestjs/common';
import { WorkItemsService } from './work-items.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('me/recent-items')
export class RecentItemsController {
  constructor(private readonly workItemsService: WorkItemsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: string) {
    const parsed = limit ? parseInt(limit, 10) : 10;
    return this.workItemsService.listRecentForUser(user, Number.isFinite(parsed) ? parsed : 10);
  }
}
