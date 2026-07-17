import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { GlobalRole } from '../generated/prisma/client.js';
import { ProjectsService } from './projects.service.js';
import { AddMemberDto } from './dto/add-member.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ProjectResource } from '../common/decorators/project-resource.decorator.js';
import { ProjectMemberGuard } from '../common/guards/project-member.guard.js';

/**
 * Controller REST para gestão de membros de um projeto (`/projects/:id/members`).
 * Todas as rotas exigem membership no projeto (ou projeto público, para GET) via
 * `ProjectMemberGuard` + `@ProjectResource('project', 'id')`. Adicionar membro aceita Admin e
 * Senior (`@Roles(ADMIN, SENIOR)`); remover continua restrito a Admin — Senior pode trazer
 * gente pro projeto, mas não tirar.
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

  /** Adiciona um usuário como membro do projeto. Restrito a administradores e Senior. */
  @Roles(GlobalRole.ADMIN, GlobalRole.SENIOR)
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
