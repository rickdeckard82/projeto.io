import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { GlobalRole } from '@prisma/client';
import { LabelsService } from './labels.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ProjectResource } from '../common/decorators/project-resource.decorator';
import { ProjectMemberGuard } from '../common/guards/project-member.guard';

@Controller('projects/:projectId/labels')
@UseGuards(ProjectMemberGuard)
@ProjectResource('project', 'projectId')
export class ProjectLabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Get()
  list(@Param('projectId') projectId: string) {
    return this.labelsService.list(projectId);
  }

  @Roles(GlobalRole.ADMIN, GlobalRole.MEMBER)
  @Post()
  create(@Param('projectId') projectId: string, @Body() dto: CreateLabelDto) {
    return this.labelsService.create(projectId, dto);
  }
}

@Controller('labels/:labelId')
@UseGuards(ProjectMemberGuard)
@ProjectResource('label', 'labelId')
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Roles(GlobalRole.ADMIN, GlobalRole.MEMBER)
  @Patch()
  update(@Param('labelId') labelId: string, @Body() dto: UpdateLabelDto) {
    return this.labelsService.update(labelId, dto);
  }

  @Roles(GlobalRole.ADMIN, GlobalRole.MEMBER)
  @Delete()
  remove(@Param('labelId') labelId: string) {
    return this.labelsService.remove(labelId);
  }
}
