import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service.js';
import { decrypt } from '../common/utils/crypto.util.js';

/**
 * Envio de e-mails transacionais (confirmação de cadastro), usando a configuração de SMTP
 * salva pelo admin em `/settings/smtp` (não variáveis de ambiente — o servidor é
 * reconfigurável em tempo de execução). Um novo transporte é montado a cada envio (sem cache),
 * para que uma mudança de configuração já valha para o próximo e-mail, sem invalidação manual.
 */
@Injectable()
export class MailerService {
  constructor(private readonly prisma: PrismaService) {}

  private async getTransportAndFrom() {
    const settings = await this.prisma.smtpSettings.findUnique({ where: { id: 'singleton' } });
    if (!settings) {
      throw new ServiceUnavailableException('Servidor de e-mail não configurado');
    }

    const transport = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.useSsl,
      auth: {
        user: settings.authUser,
        pass: decrypt(settings.authPassEncrypted),
      },
    });

    return { transport, from: settings.fromEmail };
  }

  /**
   * Envia o e-mail de confirmação de cadastro, contendo o link `${FRONTEND_URL}/verify-email?token=...`.
   * Erros de envio (SMTP incorreto, indisponível etc.) propagam para quem chamou decidir o tratamento.
   */
  async sendVerificationEmail(toEmail: string, fullName: string, rawToken: string): Promise<void> {
    const { transport, from } = await this.getTransportAndFrom();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const link = `${frontendUrl}/verify-email?token=${encodeURIComponent(rawToken)}`;

    await transport.sendMail({
      from,
      to: toEmail,
      subject: 'Confirme seu e-mail — Projeto.io',
      text: `Olá, ${fullName}!\n\nConfirme seu cadastro no Projeto.io clicando no link abaixo:\n${link}\n\nSe você não solicitou este cadastro, ignore este e-mail.`,
      html: `<p>Olá, ${fullName}!</p><p>Confirme seu cadastro no Projeto.io clicando no link abaixo:</p><p><a href="${link}">${link}</a></p><p>Se você não solicitou este cadastro, ignore este e-mail.</p>`,
    });
  }

  /**
   * Envia uma notificação do sistema (vencimento de tarefa, atribuição) por e-mail, respeitando
   * as preferências de canal do usuário (ver `NotificationsService.dispatchChannels`).
   */
  async sendNotificationEmail(
    toEmail: string,
    fullName: string,
    subject: string,
    body?: string | null,
    link?: string | null,
  ): Promise<void> {
    const { transport, from } = await this.getTransportAndFrom();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const absoluteLink = link ? `${frontendUrl}${link}` : undefined;

    const textParts = [`Olá, ${fullName}!`, subject, body, absoluteLink].filter(Boolean);
    const htmlParts = [
      `<p>Olá, ${fullName}!</p>`,
      `<p>${subject}</p>`,
      body ? `<p>${body}</p>` : '',
      absoluteLink ? `<p><a href="${absoluteLink}">${absoluteLink}</a></p>` : '',
    ].filter(Boolean);

    await transport.sendMail({
      from,
      to: toEmail,
      subject: `${subject} — Projeto.io`,
      text: textParts.join('\n\n'),
      html: htmlParts.join(''),
    });
  }
}
