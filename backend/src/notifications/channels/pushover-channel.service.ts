import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { decrypt } from '../../common/utils/crypto.util.js';

const SINGLETON_ID = 'singleton';

/**
 * Envia uma notificação por Pushover via API HTTP, usando o API token configurado pelo admin em
 * `/settings/pushover` (banco, não variável de ambiente — mesmo padrão de `TelegramChannelService`).
 */
@Injectable()
export class PushoverChannelService {
  constructor(private readonly prisma: PrismaService) {}

  async send(userKey: string, notification: { title: string; body: string | null; link: string | null }): Promise<void> {
    const settings = await this.prisma.pushoverSettings.findUnique({ where: { id: SINGLETON_ID } });
    if (!settings) {
      throw new ServiceUnavailableException('Aplicação Pushover não configurada');
    }
    const token = decrypt(settings.apiTokenEncrypted);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const res = await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        user: userKey,
        title: notification.title,
        message: notification.body || notification.title,
        url: notification.link ? `${frontendUrl}${notification.link}` : undefined,
      }),
    });
    if (!res.ok) {
      throw new Error(`Pushover respondeu ${res.status}`);
    }
  }
}
