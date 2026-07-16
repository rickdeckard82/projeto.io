import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSmtpSettingsDto } from './dto/update-smtp-settings.dto';
import { encrypt } from '../common/utils/crypto.util';

const SINGLETON_ID = 'singleton';

/**
 * Gestão da configuração única (singleton) do servidor SMTP usado para enviar e-mails de
 * confirmação de cadastro. A senha nunca é devolvida ao frontend (nem em claro nem
 * criptografada) — só é usada internamente por `MailerService` ao montar o transporte de envio.
 */
@Injectable()
export class SmtpSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna a configuração atual sem a senha (substituída por um indicador booleano
   * `hasPassword`), ou `null` se o SMTP ainda não foi configurado.
   */
  async get() {
    const settings = await this.prisma.smtpSettings.findUnique({ where: { id: SINGLETON_ID } });
    if (!settings) {
      return null;
    }
    const { authPassEncrypted, ...rest } = settings;
    return { ...rest, hasPassword: !!authPassEncrypted };
  }

  /**
   * Cria ou atualiza a configuração de SMTP. `authPass` é opcional: se omitido/vazio, mantém a
   * senha já salva (evita forçar o admin a redigitá-la a cada edição de outros campos).
   * @throws Error - quando `authPass` é informado e `ENCRYPTION_KEY` está ausente/inválida (propagado por `encrypt()`)
   */
  async update(dto: UpdateSmtpSettingsDto) {
    const existing = await this.prisma.smtpSettings.findUnique({ where: { id: SINGLETON_ID } });

    const authPassEncrypted = dto.authPass ? encrypt(dto.authPass) : existing?.authPassEncrypted;
    if (!authPassEncrypted) {
      throw new BadRequestException('Senha do SMTP é obrigatória na primeira configuração');
    }

    const data = {
      host: dto.host,
      port: dto.port,
      useSsl: dto.useSsl,
      fromEmail: dto.fromEmail,
      authUser: dto.authUser,
      authPassEncrypted,
    };

    const saved = await this.prisma.smtpSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...data },
      update: data,
    });

    const { authPassEncrypted: _omit, ...rest } = saved;
    return { ...rest, hasPassword: true };
  }
}
