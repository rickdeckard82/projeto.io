import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { GlobalRole } from '@prisma/client';
import { ProjectsService } from './projects.service';
import { AddMemberDto } from './dto/add-member.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ProjectResource } from '../common/decorators/project-resource.decorator';
import { ProjectMemberGuard } from '../common/guards/project-member.guard';

@Controller('projects/:id/members')
@UseGuards(ProjectMemberGuard)
@ProjectResource('project', 'id')
export class MembersController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  list(@Param('id') id: string) {
    return this.projectsService.listMembers(id);
  }

  @Roles(GlobalRole.ADMIN)
  @Post()
  add(@Param('id') id: string, @Body() dto: AddMemberDto) {
    return this.projectsService.addMember(id, dto.userId);
  }

  @Roles(GlobalRole.ADMIN)
  @Delete(':userId')
  remove(@Param('id') id: string, @Param('userId') userId: string) {
    return this.projectsService.removeMember(id, userId);
  }
}
