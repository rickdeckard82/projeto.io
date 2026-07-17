import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { GlobalRole } from '../generated/prisma/client.js';
import { WorkItemsService } from './work-items.service.js';
import { CreateItemDto } from './dto/create-item.dto.js';
import { QueryItemsDto } from './dto/query-items.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ProjectResource } from '../common/decorators/project-resource.decorator.js';
import { ProjectMemberGuard } from '../common/guards/project-member.guard.js';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

/**
 * Endpoints de itens de trabalho aninhados sob um projeto (`/projects/:projectId/items`):
 * listagem com filtros e criação. `ProjectResource('project', 'projectId')` diz ao
 * `ProjectMemberGuard` que o próprio parâmetro de rota já é o id do projeto, sem necessidade de
 * lookup.
 */
@Controller('projects/:projectId/items')
@UseGuards(ProjectMemberGuard)
@ProjectResource('project', 'projectId')
export class ProjectItemsController {
  constructor(private readonly workItemsService: WorkItemsService) {}

  /** Lista os itens do projeto aplicando os filtros da querystring (status, responsável, etiqueta, item pai). */
  @Get()
  list(@Param('projectId') projectId: string, @Query() query: QueryItemsDto) {
    return this.workItemsService.list(projectId, query);
  }

  /** Cria um novo item de trabalho no projeto; restrito a Admin/Senior/Membro (Visualizador não pode escrever). */
  @Roles(GlobalRole.ADMIN, GlobalRole.SENIOR, GlobalRole.MEMBER)
  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workItemsService.create(projectId, dto, user);
  }
}
