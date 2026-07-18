import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { GlobalRole } from '@prisma/client';
import { MetricsService } from './metrics.service';
import { Roles } from '../common/decorators/roles.decorator';
import { ProjectResource } from '../common/decorators/project-resource.decorator';
import { ProjectMemberGuard } from '../common/guards/project-member.guard';

/**
 * Endpoint de métricas de um projeto (`/projects/:projectId/metrics`). Restrito a Admin/Senior
 * (`@Roles`) — Membro e Visualizador não enxergam essa aba nem esse dado. Além disso, membership
 * do projeto (ou projeto público) continua exigida pelo `ProjectMemberGuard`, como no board/lista.
 */
@Controller('projects/:projectId/metrics')
@UseGuards(ProjectMemberGuard)
@ProjectResource('project', 'projectId')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Roles(GlobalRole.ADMIN, GlobalRole.SENIOR)
  @Get()
  get(@Param('projectId') projectId: string) {
    return this.metricsService.getProjectMetrics(projectId);
  }
}
