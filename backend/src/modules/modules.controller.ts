import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { GlobalRole } from '../generated/prisma/client.js';
import { ModulesService } from './modules.service.js';
import { CreateModuleDto } from './dto/create-module.dto.js';
import { UpdateModuleDto } from './dto/update-module.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ProjectResource } from '../common/decorators/project-resource.decorator.js';
import { ProjectMemberGuard } from '../common/guards/project-member.guard.js';

/**
 * Endpoints de módulos aninhados sob um projeto (`/projects/:projectId/modules`): listagem e
 * criação. O parâmetro de rota já é o id do projeto, então `ProjectResource('project', ...)`
 * dispensa lookup no `ProjectMemberGuard`.
 */
@Controller('projects/:projectId/modules')
@UseGuards(ProjectMemberGuard)
@ProjectResource('project', 'projectId')
export class ProjectModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  /** Lista os módulos do projeto. */
  @Get()
  list(@Param('projectId') projectId: string) {
    return this.modulesService.list(projectId);
  }

  /** Cria um novo módulo no projeto; restrito a Admin/Senior/Membro. */
  @Roles(GlobalRole.ADMIN, GlobalRole.SENIOR, GlobalRole.MEMBER)
  @Post()
  create(@Param('projectId') projectId: string, @Body() dto: CreateModuleDto) {
    return this.modulesService.create(projectId, dto);
  }
}

/**
 * Endpoints de um módulo individual, endereçado só por `moduleId` (`/modules/:moduleId`). Como a
 * rota não traz o `projectId`, `ProjectResource('module', 'moduleId')` instrui o
 * `ProjectMemberGuard` a resolver o projeto do módulo via lookup antes de checar acesso.
 */
@Controller('modules/:moduleId')
@UseGuards(ProjectMemberGuard)
@ProjectResource('module', 'moduleId')
export class ModuleDetailController {
  constructor(private readonly modulesService: ModulesService) {}

  /** Busca um módulo pelo id. */
  @Get()
  findOne(@Param('moduleId') moduleId: string) {
    return this.modulesService.findOne(moduleId);
  }

  /** Atualiza nome e/ou descrição do módulo; restrito a Admin/Senior/Membro. */
  @Roles(GlobalRole.ADMIN, GlobalRole.SENIOR, GlobalRole.MEMBER)
  @Patch()
  update(@Param('moduleId') moduleId: string, @Body() dto: UpdateModuleDto) {
    return this.modulesService.update(moduleId, dto);
  }

  /** Remove definitivamente o módulo; restrito a Admin/Senior/Membro. */
  @Roles(GlobalRole.ADMIN, GlobalRole.SENIOR, GlobalRole.MEMBER)
  @Delete()
  remove(@Param('moduleId') moduleId: string) {
    return this.modulesService.remove(moduleId);
  }
}
