import { Injectable } from '@nestjs/common';
import { postToPublicUrl } from './outbound-url.util.js';

/**
 * Envia uma notificação para um Space do Google Chat via webhook de entrada (URL pessoal
 * cadastrada em `/settings/notifications`). Diferente do webhook genérico, a URL já contém a
 * chave/token de autenticação do Google, então não há segredo adicional para assinar o payload.
 */
@Injectable()
export class GoogleChatChannelService {
  async send(webhookUrl: string, notification: { title: string; body: string | null; link: string | null }): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const text = [`*${notification.title}*`, notification.body, notification.link && `${frontendUrl}${notification.link}`]
      .filter(Boolean)
      .join('\n\n');

    const res = await postToPublicUrl(webhookUrl, {
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      throw new Error(`Google Chat respondeu ${res.status}`);
    }
  }
}
