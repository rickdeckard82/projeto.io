import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { GlobalRole } from '../generated/prisma/client.js';
import { ProjectsService } from './projects.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ProjectResource } from '../common/decorators/project-resource.decorator.js';
import { ProjectMemberGuard } from '../common/guards/project-member.guard.js';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

/**
 * Controller REST para gestão de projetos (`/projects`). A leitura individual e as mutações
 * usam `@UseGuards(ProjectMemberGuard)` + `@ProjectResource('project', 'id')` para exigir que
 * o usuário seja membro do projeto (ou que o projeto seja público, no caso de GET) — admins
 * sempre passam. Criar/arquivar/desarquivar aceitam Admin e Senior (`@Roles(ADMIN, SENIOR)`);
 * atualizar/remover o projeto continuam restritos a Admin.
 */
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /** Lista os projetos visíveis para o usuário autenticado (todos, se admin; membros/públicos, caso contrário). */
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query('archived') archived?: string) {
    return this.projectsService.list(user, archived === 'true');
  }

  /** Cria um novo projeto. Restrito a administradores e Senior (`@Roles(ADMIN, SENIOR)`). */
  @Roles(GlobalRole.ADMIN, GlobalRole.SENIOR)
  @Post()
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.create(dto, user);
  }

  /** Busca um projeto pelo id. Exige membership no projeto (ou projeto público) via `ProjectMemberGuard`. */
  @UseGuards(ProjectMemberGuard)
  @ProjectResource('project', 'id')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  /** Atualiza um projeto. Restrito a administradores e exige membership via `ProjectMemberGuard`. */
  @Roles(GlobalRole.ADMIN)
  @UseGuards(ProjectMemberGuard)
  @ProjectResource('project', 'id')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  /** Remove definitivamente um projeto. Restrito a administradores e exige membership via `ProjectMemberGuard`. */
  @Roles(GlobalRole.ADMIN)
  @UseGuards(ProjectMemberGuard)
  @ProjectResource('project', 'id')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }

  /** Arquiva um projeto. Restrito a administradores e Senior; exige membership via `ProjectMemberGuard`. */
  @Roles(GlobalRole.ADMIN, GlobalRole.SENIOR)
  @UseGuards(ProjectMemberGuard)
  @ProjectResource('project', 'id')
  @Patch(':id/archive')
  archive(@Param('id') id: string) {
    return this.projectsService.archive(id);
  }

  /** Desarquiva um projeto. Restrito a administradores e Senior; exige membership via `ProjectMemberGuard`. */
  @Roles(GlobalRole.ADMIN, GlobalRole.SENIOR)
  @UseGuards(ProjectMemberGuard)
  @ProjectResource('project', 'id')
  @Patch(':id/unarchive')
  unarchive(@Param('id') id: string) {
    return this.projectsService.unarchive(id);
  }

  /** Lista as colunas (statuses) do kanban do projeto. Exige membership (ou projeto público) via `ProjectMemberGuard`. */
  @UseGuards(ProjectMemberGuard)
  @ProjectResource('project', 'id')
  @Get(':id/statuses')
  listStatuses(@Param('id') id: string) {
    return this.projectsService.listStatuses(id);
  }
}
