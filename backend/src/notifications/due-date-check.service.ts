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
 *
 * Também dispara o lembrete customizado (`TASK_REMINDER`, `WorkItem.reminderAt`) numa checagem à
 * parte, a cada 5 minutos — janela mais apertada que a de vencimento porque aqui o usuário escolheu
 * um horário exato, então uma folga de até 1h (como no cron acima) seria perceptível demais.
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

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkReminders(): Promise<void> {
    await this.notifyReminders();
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

  /**
   * Dispara o lembrete customizado (`WorkItem.reminderAt`) quando o instante configurado chega,
   * uma vez só (`reminderNotifiedAt`). Notifica todos os responsáveis do item ou, se não houver
   * nenhum, quem criou o item — quem configurou o lembrete deve recebê-lo mesmo que o item ainda
   * não tenha dono.
   */
  private async notifyReminders(): Promise<void> {
    const now = new Date();
    const items = await this.prisma.workItem.findMany({
      where: { reminderAt: { lte: now }, reminderNotifiedAt: null },
      include: { assignees: true },
    });

    for (const item of items) {
      const recipientIds = item.assignees.length > 0 ? item.assignees.map((a) => a.userId) : [item.createdById];
      for (const userId of recipientIds) {
        await this.notificationsService.create({
          userId,
          type: NotificationType.TASK_REMINDER,
          title: `Lembrete: "${item.title}"`,
          link: `/projects/${item.projectId}/board?item=${item.id}`,
          metadata: { workItemId: item.id, projectId: item.projectId },
        });
      }
      await this.prisma.workItem.update({ where: { id: item.id }, data: { reminderNotifiedAt: now } });
    }
    if (items.length > 0) {
      this.logger.log(`Lembrete customizado enviado para ${items.length} item(ns)`);
    }
  }
}
