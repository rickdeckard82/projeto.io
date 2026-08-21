import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationType, StatusCategory } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from './notifications.service.js';

const DUE_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;
const OVERDUE_REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000;
const OPEN_CATEGORIES: StatusCategory[] = [StatusCategory.COMPLETED, StatusCategory.CANCELLED];

/**
 * Varre `WorkItem`s com prazo definido, de hora em hora, e notifica os responsáveis quando faltam
 * ~24h para o vencimento (`TASK_DUE_SOON`, uma vez só) e quando o prazo já passou sem o item estar
 * concluído (`TASK_OVERDUE`, repetido a cada ~24h enquanto continuar atrasada — um lembrete por
 * dia, não a cada hora que o cron roda). Ambos controlados por `dueSoonNotifiedAt`/
 * `overdueNotifiedAt` — zerados em `WorkItemsService.update` sempre que o prazo muda, para os
 * alertas poderem disparar de novo num prazo futuro.
 */
@Injectable()
export class DueDateCheckService {
  private readonly logger = new Logger(DueDateCheckService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async check(): Promise<void> {
    await this.notifyDueSoon();
    await this.notifyOverdue();
  }

  private async notifyDueSoon(): Promise<void> {
    const now = new Date();
    const items = await this.prisma.workItem.findMany({
      where: {
        dueDate: { gte: now, lte: new Date(now.getTime() + DUE_SOON_WINDOW_MS) },
        dueSoonNotifiedAt: null,
        status: { category: { notIn: OPEN_CATEGORIES } },
      },
      include: { assignees: true },
    });

    for (const item of items) {
      for (const assignee of item.assignees) {
        await this.notificationsService.create({
          userId: assignee.userId,
          type: NotificationType.TASK_DUE_SOON,
          title: `"${item.title}" vence em breve`,
          link: `/projects/${item.projectId}/board?item=${item.id}`,
          metadata: { workItemId: item.id, projectId: item.projectId },
        });
      }
      await this.prisma.workItem.update({ where: { id: item.id }, data: { dueSoonNotifiedAt: now } });
    }
    if (items.length > 0) {
      this.logger.log(`Alerta de vencimento próximo enviado para ${items.length} item(ns)`);
    }
  }

  private async notifyOverdue(): Promise<void> {
    const now = new Date();
    const items = await this.prisma.workItem.findMany({
      where: {
        dueDate: { lt: now },
        // Nunca notificada, ou notificada há mais de ~24h — lembrete diário, não a cada hora.
        OR: [{ overdueNotifiedAt: null }, { overdueNotifiedAt: { lte: new Date(now.getTime() - OVERDUE_REMINDER_INTERVAL_MS) } }],
        status: { category: { notIn: OPEN_CATEGORIES } },
      },
      include: { assignees: true },
    });

    for (const item of items) {
      for (const assignee of item.assignees) {
        await this.notificationsService.create({
          userId: assignee.userId,
          type: NotificationType.TASK_OVERDUE,
          title: `"${item.title}" está atrasada`,
          link: `/projects/${item.projectId}/board?item=${item.id}`,
          metadata: { workItemId: item.id, projectId: item.projectId },
        });
      }
      await this.prisma.workItem.update({ where: { id: item.id }, data: { overdueNotifiedAt: now } });
    }
    if (items.length > 0) {
      this.logger.log(`Alerta de tarefa atrasada enviado para ${items.length} item(ns)`);
    }
  }
}
