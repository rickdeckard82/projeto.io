import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { ProjectResource } from '../common/decorators/project-resource.decorator';
import { ProjectMemberGuard } from '../common/guards/project-member.guard';

/**
 * Endpoint de métricas de um projeto (`/projects/:projectId/metrics`). Leitura, sem restrição de
 * papel além da membership do projeto (ou projeto público) já garantida pelo `ProjectMemberGuard`
 * — mesma regra de acesso do board/lista.
 */
@Controller('projects/:projectId/metrics')
@UseGuards(ProjectMemberGuard)
@ProjectResource('project', 'projectId')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  get(@Param('projectId') projectId: string) {
    return this.metricsService.getProjectMetrics(projectId);
  }
}
