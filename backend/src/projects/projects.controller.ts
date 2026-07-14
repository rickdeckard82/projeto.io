import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { GlobalRole } from '@prisma/client';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ProjectResource } from '../common/decorators/project-resource.decorator';
import { ProjectMemberGuard } from '../common/guards/project-member.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query('archived') archived?: string) {
    return this.projectsService.list(user, archived === 'true');
  }

  @Roles(GlobalRole.ADMIN)
  @Post()
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.create(dto, user);
  }

  @UseGuards(ProjectMemberGuard)
  @ProjectResource('project', 'id')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Roles(GlobalRole.ADMIN)
  @UseGuards(ProjectMemberGuard)
  @ProjectResource('project', 'id')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Roles(GlobalRole.ADMIN)
  @UseGuards(ProjectMemberGuard)
  @ProjectResource('project', 'id')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }

  @Roles(GlobalRole.ADMIN)
  @UseGuards(ProjectMemberGuard)
  @ProjectResource('project', 'id')
  @Patch(':id/archive')
  archive(@Param('id') id: string) {
    return this.projectsService.archive(id);
  }

  @Roles(GlobalRole.ADMIN)
  @UseGuards(ProjectMemberGuard)
  @ProjectResource('project', 'id')
  @Patch(':id/unarchive')
  unarchive(@Param('id') id: string) {
    return this.projectsService.unarchive(id);
  }

  @UseGuards(ProjectMemberGuard)
  @ProjectResource('project', 'id')
  @Get(':id/statuses')
  listStatuses(@Param('id') id: string) {
    return this.projectsService.listStatuses(id);
  }
}
