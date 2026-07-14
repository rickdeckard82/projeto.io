import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { GlobalRole } from '@prisma/client';
import { ProjectsService } from './projects.service';
import { UpdateStatusDto } from './dto/update-status.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ProjectResource } from '../common/decorators/project-resource.decorator';
import { ProjectMemberGuard } from '../common/guards/project-member.guard';

@Controller('projects/:id/statuses')
@UseGuards(ProjectMemberGuard)
@ProjectResource('project', 'id')
export class StatusesController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Roles(GlobalRole.ADMIN)
  @Patch(':statusId')
  update(@Param('statusId') statusId: string, @Body() dto: UpdateStatusDto) {
    return this.projectsService.updateStatus(statusId, dto);
  }
}
