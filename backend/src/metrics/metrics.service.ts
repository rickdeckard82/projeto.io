import { Injectable, NotFoundException } from '@nestjs/common';
import { StatusCategory } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/**
 * Métricas agregadas de um projeto: quantidade de itens por categoria de status, tempo médio até
 * a conclusão, duração do projeto e um resumo por responsável (quantos itens cada um pegou,
 * quantos concluiu/cancelou). Tudo derivado do que já existe em `WorkItem`/`Project` — nenhuma
 * tabela nova, nenhum tracking contínuo de tempo (não existe "cronômetro" de trabalho, só o
 * histórico de mudança de status).
 */
@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula as métricas de um projeto.
   * @param projectId - id do projeto
   * @throws NotFoundException - se o projeto não existir
   */
  async getProjectMetrics(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { createdAt: true, archivedAt: true },
    });
    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    const items = await this.prisma.workItem.findMany({
      where: { projectId },
      select: {
        createdAt: true,
        updatedAt: true,
        status: { select: { category: true } },
        assignees: { select: { user: { select: { id: true, fullName: true, avatarUrl: true } } } },
      },
    });

    const byCategory: Record<StatusCategory, number> = {
      BACKLOG: 0,
      UNSTARTED: 0,
      STARTED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    const completionDurationsMs: number[] = [];
    const userStats = new Map<
      string,
      { userId: string; fullName: string; avatarUrl: string | null; assigned: number; completed: number; cancelled: number }
    >();

    for (const item of items) {
      byCategory[item.status.category]++;

      // Aproximação: como um item concluído/cancelado não muda mais de status na prática
      // (regras de negócio de sub-item/travas não permitem reabrir), `updatedAt` reflete o
      // momento em que ele chegou nessa categoria — não há um "tempo de conclusão" explícito
      // guardado à parte.
      if (item.status.category === StatusCategory.COMPLETED) {
        completionDurationsMs.push(item.updatedAt.getTime() - item.createdAt.getTime());
      }

      for (const { user } of item.assignees) {
        if (!userStats.has(user.id)) {
          userStats.set(user.id, {
            userId: user.id,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
            assigned: 0,
            completed: 0,
            cancelled: 0,
          });
        }
        const stats = userStats.get(user.id)!;
        stats.assigned++;
        if (item.status.category === StatusCategory.COMPLETED) stats.completed++;
        if (item.status.category === StatusCategory.CANCELLED) stats.cancelled++;
      }
    }

    const avgCompletionHours = completionDurationsMs.length
      ? completionDurationsMs.reduce((sum, ms) => sum + ms, 0) / completionDurationsMs.length / MS_PER_HOUR
      : null;

    const projectDurationDays = ((project.archivedAt ?? new Date()).getTime() - project.createdAt.getTime()) / MS_PER_DAY;

    return {
      totalItems: items.length,
      byCategory,
      avgCompletionHours,
      projectDurationDays,
      perUser: [...userStats.values()].sort((a, b) => b.assigned - a.assigned),
    };
  }
}
