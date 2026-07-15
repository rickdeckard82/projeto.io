import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { GlobalRole } from '@prisma/client';
import { ProjectsService } from './projects.service';
import { AddMemberDto } from './dto/add-member.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ProjectResource } from '../common/decorators/project-resource.decorator';
import { ProjectMemberGuard } from '../common/guards/project-member.guard';

/**
 * Controller REST para gestão de membros de um projeto (`/projects/:id/members`).
 * Todas as rotas exigem membership no projeto (ou projeto público, para GET) via
 * `ProjectMemberGuard` + `@ProjectResource('project', 'id')`; adicionar e remover membros
 * são restritos a administradores globais (`@Roles(ADMIN)`).
 */
@Controller('projects/:id/members')
@UseGuards(ProjectMemberGuard)
@ProjectResource('project', 'id')
export class MembersController {
  constructor(private readonly projectsService: ProjectsService) {}

  /** Lista os membros do projeto. */
  @Get()
  list(@Param('id') id: string) {
    return this.projectsService.listMembers(id);
  }

  /** Adiciona um usuário como membro do projeto. Restrito a administradores. */
  @Roles(GlobalRole.ADMIN)
  @Post()
  add(@Param('id') id: string, @Body() dto: AddMemberDto) {
    return this.projectsService.addMember(id, dto.userId);
  }

  /** Remove um usuário dos membros do projeto (não é permitido remover o proprietário). Restrito a administradores. */
  @Roles(GlobalRole.ADMIN)
  @Delete(':userId')
  remove(@Param('id') id: string, @Param('userId') userId: string) {
    return this.projectsService.removeMember(id, userId);
  }
}
