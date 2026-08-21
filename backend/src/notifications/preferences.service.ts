import { BadRequestException, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdatePreferencesDto } from './dto/update-preferences.dto.js';
import { TelegramChannelService } from './channels/telegram-channel.service.js';
import { WebhookChannelService } from './channels/webhook-channel.service.js';

const DEFAULTS = { emailEnabled: true, telegramEnabled: false, webhookEnabled: false };

function omitSecret<T extends { webhookSecret: string | null }>(prefs: T) {
  const { webhookSecret, ...rest } = prefs;
  return { ...rest, hasWebhookSecret: !!webhookSecret };
}

/**
 * Preferências de canal de notificação por usuário — cada usuário só lê/edita as próprias (não há
 * rota administrativa para mexer nas preferências de outro usuário). O segredo do webhook nunca é
 * devolvido ao frontend, só um indicador booleano (mesmo padrão de `SmtpSettingsService`).
 */
@Injectable()
export class NotificationPreferencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramChannel: TelegramChannelService,
    private readonly webhookChannel: WebhookChannelService,
  ) {}

  async get(userId: string) {
    const existing = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    if (existing) {
      return omitSecret(existing);
    }
    return omitSecret({ userId, ...DEFAULTS, telegramChatId: null, webhookUrl: null, webhookSecret: null, updatedAt: new Date() });
  }

  async update(userId: string, dto: UpdatePreferencesDto) {
    const existing = await this.prisma.notificationPreference.findUnique({ where: { userId } });

    // Novo segredo sempre que a URL do webhook é definida pela primeira vez ou muda de valor —
    // rotacionar a assinatura quando o destino muda evita que um segredo antigo valide payloads
    // para um endpoint diferente. URL removida (string vazia) também limpa o segredo.
    const webhookUrl = dto.webhookUrl !== undefined ? dto.webhookUrl || null : (existing?.webhookUrl ?? null);
    let webhookSecret = existing?.webhookSecret ?? null;
    if (!webhookUrl) {
      webhookSecret = null;
    } else if (webhookUrl !== existing?.webhookUrl) {
      webhookSecret = crypto.randomBytes(32).toString('hex');
    }

    const data = {
      emailEnabled: dto.emailEnabled ?? existing?.emailEnabled ?? DEFAULTS.emailEnabled,
      telegramEnabled: dto.telegramEnabled ?? existing?.telegramEnabled ?? DEFAULTS.telegramEnabled,
      webhookEnabled: dto.webhookEnabled ?? existing?.webhookEnabled ?? DEFAULTS.webhookEnabled,
      telegramChatId: dto.telegramChatId !== undefined ? dto.telegramChatId || null : existing?.telegramChatId,
      webhookUrl,
      webhookSecret,
    };

    const saved = await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return omitSecret(saved);
  }

  /** Envia uma notificação de teste para o Telegram usando o `telegramChatId` já salvo pelo usuário. */
  async testTelegram(userId: string) {
    const prefs = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    if (!prefs?.telegramChatId) {
      throw new BadRequestException('Cadastre seu chat id do Telegram antes de testar');
    }
    await this.telegramChannel.send(prefs.telegramChatId, {
      title: 'Notificação de teste — Projeto.io',
      body: 'Se você recebeu esta mensagem, suas notificações do Telegram estão configuradas corretamente.',
      link: null,
    });
    return { message: 'Mensagem de teste enviada' };
  }

  /** Envia uma notificação de teste para o webhook usando a `webhookUrl`/`webhookSecret` já salvos. */
  async testWebhook(userId: string) {
    const prefs = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    if (!prefs?.webhookUrl || !prefs.webhookSecret) {
      throw new BadRequestException('Cadastre sua URL de webhook antes de testar');
    }
    await this.webhookChannel.send(prefs.webhookUrl, prefs.webhookSecret, {
      type: 'TEST',
      title: 'Notificação de teste — Projeto.io',
      body: 'Se você recebeu este payload, seu webhook está configurado corretamente.',
      link: null,
    });
    return { message: 'Payload de teste enviado' };
  }
}
