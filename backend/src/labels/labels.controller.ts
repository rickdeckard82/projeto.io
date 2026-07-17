import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { GlobalRole } from '../generated/prisma/client.js';
import { LabelsService } from './labels.service.js';
import { CreateLabelDto } from './dto/create-label.dto.js';
import { UpdateLabelDto } from './dto/update-label.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ProjectResource } from '../common/decorators/project-resource.decorator.js';
import { ProjectMemberGuard } from '../common/guards/project-member.guard.js';

/**
 * Endpoints de etiquetas aninhadas sob um projeto (`/projects/:projectId/labels`): listagem e
 * criação. O parâmetro de rota já é o id do projeto, então `ProjectResource('project', ...)`
 * dispensa lookup no `ProjectMemberGuard`.
 */
@Controller('projects/:projectId/labels')
@UseGuards(ProjectMemberGuard)
@ProjectResource('project', 'projectId')
export class ProjectLabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  /** Lista as etiquetas do projeto. */
  @Get()
  list(@Param('projectId') projectId: string) {
    return this.labelsService.list(projectId);
  }

  /** Cria uma nova etiqueta no projeto; restrito a Admin/Senior/Membro. */
  @Roles(GlobalRole.ADMIN, GlobalRole.SENIOR, GlobalRole.MEMBER)
  @Post()
  create(@Param('projectId') projectId: string, @Body() dto: CreateLabelDto) {
    return this.labelsService.create(projectId, dto);
  }
}

/**
 * Endpoints de uma etiqueta individual, endereçada só por `labelId` (`/labels/:labelId`). Como a
 * rota não traz o `projectId`, `ProjectResource('label', 'labelId')` instrui o
 * `ProjectMemberGuard` a resolver o projeto da etiqueta via lookup antes de checar acesso.
 */
@Controller('labels/:labelId')
@UseGuards(ProjectMemberGuard)
@ProjectResource('label', 'labelId')
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  /** Atualiza nome e/ou cor da etiqueta; restrito a Admin/Senior/Membro. */
  @Roles(GlobalRole.ADMIN, GlobalRole.SENIOR, GlobalRole.MEMBER)
  @Patch()
  update(@Param('labelId') labelId: string, @Body() dto: UpdateLabelDto) {
    return this.labelsService.update(labelId, dto);
  }

  /** Remove definitivamente a etiqueta; restrito a Admin/Senior/Membro. */
  @Roles(GlobalRole.ADMIN, GlobalRole.SENIOR, GlobalRole.MEMBER)
  @Delete()
  remove(@Param('labelId') labelId: string) {
    return this.labelsService.remove(labelId);
  }
}
