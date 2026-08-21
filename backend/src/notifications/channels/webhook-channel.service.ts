import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Envia uma notificação via webhook do próprio usuário (URL pessoal cadastrada em
 * `/settings/notifications`), assinando o payload com HMAC-SHA256 (`X-Signature`) para que o
 * receptor possa verificar autenticidade — o segredo é gerado uma vez ao salvar a URL
 * (`NotificationPreferencesService.update`) e nunca é reexibido em claro.
 */
@Injectable()
export class WebhookChannelService {
  async send(
    url: string,
    secret: string,
    notification: { type: string; title: string; body: string | null; link: string | null },
  ): Promise<void> {
    const payload = JSON.stringify({
      type: notification.type,
      title: notification.title,
      body: notification.body,
      link: notification.link,
      sentAt: new Date().toISOString(),
    });
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Signature': `sha256=${signature}` },
      body: payload,
    });
    if (!res.ok) {
      throw new Error(`Webhook respondeu ${res.status}`);
    }
  }
}
