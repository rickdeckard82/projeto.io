import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { GlobalRole } from '../generated/prisma/client.js';
import { ProjectsService } from './projects.service.js';
import { UpdateStatusDto } from './dto/update-status.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ProjectResource } from '../common/decorators/project-resource.decorator.js';
import { ProjectMemberGuard } from '../common/guards/project-member.guard.js';

/**
 * Controller REST para gestão das colunas (statuses) do kanban de um projeto
 * (`/projects/:id/statuses`). Exige membership no projeto (ou projeto público) via
 * `ProjectMemberGuard` + `@ProjectResource('project', 'id')`.
 */
@Controller('projects/:id/statuses')
@UseGuards(ProjectMemberGuard)
@ProjectResource('project', 'id')
export class StatusesController {
  constructor(private readonly projectsService: ProjectsService) {}

  /** Atualiza uma coluna (status) do kanban, por exemplo para renomear ou reordenar. Restrito a administradores. */
  @Roles(GlobalRole.ADMIN)
  @Patch(':statusId')
  update(@Param('statusId') statusId: string, @Body() dto: UpdateStatusDto) {
    return this.projectsService.updateStatus(statusId, dto);
  }
}
