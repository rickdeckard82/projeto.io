import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { GlobalRole } from '@prisma/client';
import { WorkItemsService } from './work-items.service';
import { UpdateItemDto } from './dto/update-item.dto';
import { UpdateItemStatusDto } from './dto/update-item-status.dto';
import { UpdateItemAssigneesDto } from './dto/update-item-assignees.dto';
import { UpdateItemLabelsDto } from './dto/update-item-labels.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ProjectResource } from '../common/decorators/project-resource.decorator';
import { ProjectMemberGuard } from '../common/guards/project-member.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

/**
 * Endpoints de um item de trabalho individual, endereçado só por `itemId` (`/items/:itemId`),
 * sem `projectId` na rota — existe separado de `ProjectItemsController` porque, uma vez que se
 * tem o id do item, não faz sentido exigir o id do projeto na URL também. Como a rota não traz o
 * `projectId`, aqui `@ProjectResource('workItem', 'itemId')` diz ao `ProjectMemberGuard` para
 * primeiro buscar o item pelo `itemId` e então resolver o `projectId` dele, para então checar a
 * membership/visibilidade do projeto.
 */
@Controller('items/:itemId')
@UseGuards(ProjectMemberGuard)
@ProjectResource('workItem', 'itemId')
export class ItemDetailController {
  constructor(private readonly workItemsService: WorkItemsService) {}

  /** Busca os detalhes de um item de trabalho pelo id. */
  @Get()
  findOne(@Param('itemId') itemId: string) {
    return this.workItemsService.findOne(itemId);
  }

  /** Atualiza campos do item (título, descrição, prioridade, datas, pai); restrito a Admin/Senior/Membro. */
  @Roles(GlobalRole.ADMIN, GlobalRole.SENIOR, GlobalRole.MEMBER)
  @Patch()
  update(@Param('itemId') itemId: string, @Body() dto: UpdateItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.workItemsService.update(itemId, dto, user);
  }

  /** Move o item para outro status/coluna do kanban; restrito a Admin/Senior/Membro. */
  @Roles(GlobalRole.ADMIN, GlobalRole.SENIOR, GlobalRole.MEMBER)
  @Patch('status')
  updateStatus(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workItemsService.updateStatus(itemId, dto.statusId, user);
  }

  /** Substitui a lista de responsáveis pelo item; restrito a Admin/Senior/Membro. */
  @Roles(GlobalRole.ADMIN, GlobalRole.SENIOR, GlobalRole.MEMBER)
  @Patch('assignees')
  updateAssignees(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemAssigneesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workItemsService.updateAssignees(itemId, dto.userIds, user);
  }

  /** Substitui a lista de etiquetas do item; restrito a Admin/Senior/Membro. */
  @Roles(GlobalRole.ADMIN, GlobalRole.SENIOR, GlobalRole.MEMBER)
  @Patch('labels')
  updateLabels(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemLabelsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workItemsService.updateLabels(itemId, dto.labelIds, user);
  }

  /** Lista o histórico de atividade (eventos + comentários) do item, em ordem cronológica. */
  @Get('activities')
  listActivities(@Param('itemId') itemId: string) {
    return this.workItemsService.listActivities(itemId);
  }

  /** Adiciona um comentário ao item; restrito a Admin/Senior/Membro. */
  @Roles(GlobalRole.ADMIN, GlobalRole.SENIOR, GlobalRole.MEMBER)
  @Post('comments')
  addComment(@Param('itemId') itemId: string, @Body() dto: CreateCommentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.workItemsService.addComment(itemId, dto.message, user);
  }

  /** Remove definitivamente o item; restrito a Admin/Senior/Membro. */
  @Roles(GlobalRole.ADMIN, GlobalRole.SENIOR, GlobalRole.MEMBER)
  @Delete()
  remove(@Param('itemId') itemId: string) {
    return this.workItemsService.remove(itemId);
  }
}
