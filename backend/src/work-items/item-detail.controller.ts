import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { GlobalRole } from '@prisma/client';
import { WorkItemsService } from './work-items.service';
import { UpdateItemDto } from './dto/update-item.dto';
import { UpdateItemStatusDto } from './dto/update-item-status.dto';
import { UpdateItemAssigneesDto } from './dto/update-item-assignees.dto';
import { UpdateItemLabelsDto } from './dto/update-item-labels.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ProjectResource } from '../common/decorators/project-resource.decorator';
import { ProjectMemberGuard } from '../common/guards/project-member.guard';

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

  /** Atualiza campos do item (título, descrição, prioridade, datas, pai); restrito a Admin/Membro. */
  @Roles(GlobalRole.ADMIN, GlobalRole.MEMBER)
  @Patch()
  update(@Param('itemId') itemId: string, @Body() dto: UpdateItemDto) {
    return this.workItemsService.update(itemId, dto);
  }

  /** Move o item para outro status/coluna do kanban; restrito a Admin/Membro. */
  @Roles(GlobalRole.ADMIN, GlobalRole.MEMBER)
  @Patch('status')
  updateStatus(@Param('itemId') itemId: string, @Body() dto: UpdateItemStatusDto) {
    return this.workItemsService.updateStatus(itemId, dto.statusId);
  }

  /** Substitui a lista de responsáveis pelo item; restrito a Admin/Membro. */
  @Roles(GlobalRole.ADMIN, GlobalRole.MEMBER)
  @Patch('assignees')
  updateAssignees(@Param('itemId') itemId: string, @Body() dto: UpdateItemAssigneesDto) {
    return this.workItemsService.updateAssignees(itemId, dto.userIds);
  }

  /** Substitui a lista de etiquetas do item; restrito a Admin/Membro. */
  @Roles(GlobalRole.ADMIN, GlobalRole.MEMBER)
  @Patch('labels')
  updateLabels(@Param('itemId') itemId: string, @Body() dto: UpdateItemLabelsDto) {
    return this.workItemsService.updateLabels(itemId, dto.labelIds);
  }

  /** Remove definitivamente o item; restrito a Admin/Membro. */
  @Roles(GlobalRole.ADMIN, GlobalRole.MEMBER)
  @Delete()
  remove(@Param('itemId') itemId: string) {
    return this.workItemsService.remove(itemId);
  }
}
