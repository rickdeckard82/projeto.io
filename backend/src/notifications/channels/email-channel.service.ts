import { Injectable } from '@nestjs/common';
import { MailerService } from '../../mail/mailer.service.js';

/** Envia uma notificação por e-mail, reaproveitando o transporte/config de `MailerService`. */
@Injectable()
export class EmailChannelService {
  constructor(private readonly mailerService: MailerService) {}

  async send(
    toEmail: string,
    fullName: string,
    notification: { title: string; body: string | null; link: string | null },
  ): Promise<void> {
    await this.mailerService.sendNotificationEmail(toEmail, fullName, notification.title, notification.body, notification.link);
  }
}
