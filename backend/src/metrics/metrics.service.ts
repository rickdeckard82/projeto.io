import { Injectable, NotFoundException } from '@nestjs/common';
import { StatusCategory } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const MS_PER_DAY = 86_400_000;
const SEC_PER_HOUR = 3_600;

/**
 * Métricas agregadas de um projeto: quantidade de itens por categoria de status, tempo médio "em
 * andamento" até a conclusão (por item), tempo de execução do projeto (soma do tempo "em
 * andamento" de todos os itens), duração de calendário do projeto, um resumo por responsável
 * (quantos itens cada um pegou, quantos concluiu/cancelou, e quantas horas somadas dos itens em
 * que foi responsável) e as tarefas recorrentes ativas do projeto (quantas existem e quantas vezes
 * cada uma já se repetiu). O tempo "em andamento" vem de `WorkItem.inProgressSeconds`/
 * `inProgressSince`, mantidos por `WorkItemsService.updateStatus` a cada transição de status —
 * mede o tempo real que cada item passou em categoria STARTED, mesmo que ele saia e volte pra essa
 * categoria mais de uma vez.
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
        id: true,
        title: true,
        inProgressSeconds: true,
        inProgressSince: true,
        status: { select: { category: true } },
        assignees: { select: { user: { select: { id: true, fullName: true, avatarUrl: true } } } },
        recurrenceUnit: true,
        recurrenceInterval: true,
        recurrenceCount: true,
        recurrenceEndsHere: true,
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
      {
        userId: string;
        fullName: string;
        avatarUrl: string | null;
        assigned: number;
        completed: number;
        cancelled: number;
        totalSeconds: number;
      }
    >();
    const recurringTasks: { id: string; title: string; recurrenceCount: number; endsHere: boolean }[] = [];

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

      // Representante da série recorrente: o item ainda ativo (não chegou em COMPLETED/CANCELLED)
      // — como o item anterior fica travado em COMPLETED assim que gera a próxima ocorrência,
      // nunca há mais de um ativo por série. Ou, quando a série já foi encerrada de propósito
      // (`recurrenceEndsHere`), o último item concluído: a série segue aparecendo nas métricas
      // mesmo sem ocorrência ativa.
      const isOpen =
        item.status.category !== StatusCategory.COMPLETED && item.status.category !== StatusCategory.CANCELLED;
      const isEndedFinal = item.recurrenceEndsHere && item.status.category === StatusCategory.COMPLETED;
      if (item.recurrenceUnit && (isOpen || isEndedFinal)) {
        recurringTasks.push({
          id: item.id,
          title: item.title,
          recurrenceCount: item.recurrenceCount,
          endsHere: item.recurrenceEndsHere,
        });
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
            totalSeconds: 0,
          });
        }
        const stats = userStats.get(user.id)!;
        stats.assigned++;
        if (item.status.category === StatusCategory.COMPLETED) stats.completed++;
        if (item.status.category === StatusCategory.CANCELLED) stats.cancelled++;
        // Soma o tempo "em andamento" de todo item em que o usuário é responsável, sem dividir
        // entre múltiplos responsáveis do mesmo item — cada responsável "leva" o tempo inteiro do
        // item, não uma fração dele (não há como saber quem de fato trabalhou quanto).
        stats.totalSeconds += effectiveSeconds;
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
      perUser: [...userStats.values()]
        .map((u) => ({ ...u, totalHours: u.totalSeconds / SEC_PER_HOUR }))
        .sort((a, b) => b.assigned - a.assigned),
      recurringTasks: {
        count: recurringTasks.length,
        totalOccurrences: recurringTasks.reduce((sum, r) => sum + r.recurrenceCount, 0),
        items: recurringTasks.sort((a, b) => b.recurrenceCount - a.recurrenceCount),
      },
    };
  }
}
