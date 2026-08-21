import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { decrypt } from '../../common/utils/crypto.util.js';

const SINGLETON_ID = 'singleton';

/**
 * Envia uma notificação por Telegram via Bot API, usando o token configurado pelo admin em
 * `/settings/telegram` (banco, não variável de ambiente — mesmo padrão de `SmtpSettings`).
 */
@Injectable()
export class TelegramChannelService {
  constructor(private readonly prisma: PrismaService) {}

  async send(chatId: string, notification: { title: string; body: string | null; link: string | null }): Promise<void> {
    const settings = await this.prisma.telegramSettings.findUnique({ where: { id: SINGLETON_ID } });
    if (!settings) {
      throw new ServiceUnavailableException('Bot do Telegram não configurado');
    }
    const token = decrypt(settings.botTokenEncrypted);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const text = [notification.title, notification.body, notification.link && `${frontendUrl}${notification.link}`]
      .filter(Boolean)
      .join('\n\n');

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      throw new Error(`Telegram respondeu ${res.status}`);
    }
  }
}
