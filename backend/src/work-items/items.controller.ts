import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { GlobalRole } from '@prisma/client';
import { WorkItemsService } from './work-items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { QueryItemsDto } from './dto/query-items.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ProjectResource } from '../common/decorators/project-resource.decorator';
import { ProjectMemberGuard } from '../common/guards/project-member.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('projects/:projectId/items')
@UseGuards(ProjectMemberGuard)
@ProjectResource('project', 'projectId')
export class ProjectItemsController {
  constructor(private readonly workItemsService: WorkItemsService) {}

  @Get()
  list(@Param('projectId') projectId: string, @Query() query: QueryItemsDto) {
    return this.workItemsService.list(projectId, query);
  }

  @Roles(GlobalRole.ADMIN, GlobalRole.MEMBER)
  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workItemsService.create(projectId, dto, user);
  }
}
