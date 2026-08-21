import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { EmailChannelService } from './channels/email-channel.service.js';
import { TelegramChannelService } from './channels/telegram-channel.service.js';
import { WebhookChannelService } from './channels/webhook-channel.service.js';

const DEFAULT_LIST_LIMIT = 20;

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Ponto único de criação de notificações: qualquer gatilho do sistema (atribuição de tarefa,
 * checagem de vencimento) passa por aqui. Sempre grava o registro (histórico do sino) e emite os
 * eventos de tempo real, independente de o usuário ter algum canal externo habilitado — os canais
 * (e-mail/Telegram/webhook) são disparados em paralelo, best-effort, sem nunca impedir a
 * notificação em si nem uns aos outros.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly emailChannel: EmailChannelService,
    private readonly telegramChannel: TelegramChannelService,
    private readonly webhookChannel: WebhookChannelService,
  ) {}

  async create(input: CreateNotificationInput) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    this.realtimeGateway.emitNotificationCreated(input.userId, notification);
    this.realtimeGateway.emitUnreadCountChanged(input.userId, await this.countUnread(input.userId));

    void this.dispatchChannels(input.userId, notification);

    return notification;
  }

  async list(userId: string, options: { limit?: number; cursor?: string; onlyUnread?: boolean }) {
    const limit = options.limit && options.limit > 0 ? Math.min(options.limit, 100) : DEFAULT_LIST_LIMIT;
    const items = await this.prisma.notification.findMany({
      where: { userId, ...(options.onlyUnread ? { readAt: null } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });

    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    return { items: page, nextCursor: hasMore ? page[page.length - 1].id : null };
  }

  countUnread(userId: string) {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(id: string, actor: AuthenticatedUser) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      throw new NotFoundException('Notificação não encontrada');
    }
    if (notification.userId !== actor.id) {
      throw new ForbiddenException('Você só pode marcar como lidas as próprias notificações');
    }

    const updated = await this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
    this.realtimeGateway.emitUnreadCountChanged(actor.id, await this.countUnread(actor.id));
    return updated;
  }

  async markAllRead(actor: AuthenticatedUser) {
    const result = await this.prisma.notification.updateMany({
      where: { userId: actor.id, readAt: null },
      data: { readAt: new Date() },
    });
    this.realtimeGateway.emitUnreadCountChanged(actor.id, 0);
    return { count: result.count };
  }

  /**
   * Despacha a notificação para os canais externos habilitados nas preferências do usuário.
   * "Fire and forget" com try/catch por canal — a falha de um (ex. webhook do usuário fora do ar)
   * nunca deve impedir a notificação em si nem os outros canais.
   */
  private async dispatchChannels(
    userId: string,
    notification: { type: NotificationType; title: string; body: string | null; link: string | null },
  ): Promise<void> {
    const [prefs, user] = await Promise.all([
      this.prisma.notificationPreference.findUnique({ where: { userId } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);
    if (!user) return;

    if (prefs?.emailEnabled ?? true) {
      this.emailChannel
        .send(user.email, user.fullName, notification)
        .catch((e) => this.logger.warn(`Falha ao enviar notificação por e-mail para ${user.email}: ${e.message}`));
    }
    if (prefs?.telegramEnabled && prefs.telegramChatId) {
      this.telegramChannel
        .send(prefs.telegramChatId, notification)
        .catch((e) => this.logger.warn(`Falha ao enviar notificação por Telegram para ${userId}: ${e.message}`));
    }
    if (prefs?.webhookEnabled && prefs.webhookUrl && prefs.webhookSecret) {
      this.webhookChannel
        .send(prefs.webhookUrl, prefs.webhookSecret, notification)
        .catch((e) => this.logger.warn(`Falha ao enviar notificação por webhook para ${userId}: ${e.message}`));
    }
  }
}
