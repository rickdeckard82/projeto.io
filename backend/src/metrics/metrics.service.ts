import { Injectable, NotFoundException } from '@nestjs/common';
import { StatusCategory } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const MS_PER_DAY = 86_400_000;
const SEC_PER_HOUR = 3_600;

/**
 * Métricas agregadas de um projeto: quantidade de itens por categoria de status, tempo médio "em
 * andamento" até a conclusão (por item), tempo de execução do projeto (soma do tempo "em
 * andamento" de todos os itens), duração de calendário do projeto e um resumo por responsável
 * (quantos itens cada um pegou, quantos concluiu/cancelou). O tempo "em andamento" vem de
 * `WorkItem.inProgressSeconds`/`inProgressSince`, mantidos por `WorkItemsService.updateStatus` a
 * cada transição de status — mede o tempo real que cada item passou em categoria STARTED, mesmo
 * que ele saia e volte pra essa categoria mais de uma vez.
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
        inProgressSeconds: true,
        inProgressSince: true,
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
    const now = new Date();
    const inProgressSecondsOfCompleted: number[] = [];
    let totalExecutionSeconds = 0;
    const userStats = new Map<
      string,
      { userId: string; fullName: string; avatarUrl: string | null; assigned: number; completed: number; cancelled: number }
    >();

    for (const item of items) {
      byCategory[item.status.category]++;

      // Tempo "efetivo" em andamento: o acumulado já consolidado, mais o intervalo em curso se o
      // item estiver em STARTED agora mesmo (inProgressSince preenchido) — para não subestimar
      // itens ainda sendo trabalhados no momento do cálculo.
      const ongoingSeconds = item.inProgressSince ? (now.getTime() - item.inProgressSince.getTime()) / 1000 : 0;
      const effectiveSeconds = item.inProgressSeconds + ongoingSeconds;
      totalExecutionSeconds += effectiveSeconds;

      // `inProgressSeconds` de um item COMPLETED já é o tempo final "em andamento" antes da
      // conclusão — ver `WorkItemsService.updateStatus`.
      if (item.status.category === StatusCategory.COMPLETED) {
        inProgressSecondsOfCompleted.push(item.inProgressSeconds);
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

    const avgInProgressHours = inProgressSecondsOfCompleted.length
      ? inProgressSecondsOfCompleted.reduce((sum, s) => sum + s, 0) / inProgressSecondsOfCompleted.length / SEC_PER_HOUR
      : null;

    const totalExecutionHours = totalExecutionSeconds / SEC_PER_HOUR;
    const projectDurationDays = ((project.archivedAt ?? new Date()).getTime() - project.createdAt.getTime()) / MS_PER_DAY;

    return {
      totalItems: items.length,
      byCategory,
      avgInProgressHours,
      totalExecutionHours,
      projectDurationDays,
      perUser: [...userStats.values()].sort((a, b) => b.assigned - a.assigned),
    };
  }
}
