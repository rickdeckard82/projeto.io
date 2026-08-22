import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdatePushoverSettingsDto } from './dto/update-pushover-settings.dto.js';
import { encrypt } from '../common/utils/crypto.util.js';

const SINGLETON_ID = 'singleton';

/**
 * Gestão da configuração única (singleton) da aplicação Pushover usada para enviar notificações. O
 * API token nunca é devolvido ao frontend (nem em claro nem criptografado) — só é usado
 * internamente por `PushoverChannelService` ao chamar a API do Pushover.
 */
@Injectable()
export class PushoverSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Retorna a configuração atual sem o token (substituído por `hasToken`), ou `null` se ainda não configurado. */
  async get() {
    const settings = await this.prisma.pushoverSettings.findUnique({ where: { id: SINGLETON_ID } });
    if (!settings) {
      return null;
    }
    const { apiTokenEncrypted, ...rest } = settings;
    return { ...rest, hasToken: !!apiTokenEncrypted };
  }

  /**
   * Cria ou atualiza a configuração da aplicação. `apiToken` é opcional: se omitido/vazio, mantém
   * o token já salvo.
   * @throws BadRequestException - se não houver token informado nem já salvo
   */
  async update(dto: UpdatePushoverSettingsDto) {
    const existing = await this.prisma.pushoverSettings.findUnique({ where: { id: SINGLETON_ID } });

    const apiTokenEncrypted = dto.apiToken ? encrypt(dto.apiToken) : existing?.apiTokenEncrypted;
    if (!apiTokenEncrypted) {
      throw new BadRequestException('API token é obrigatório na primeira configuração');
    }

    const saved = await this.prisma.pushoverSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, apiTokenEncrypted },
      update: { apiTokenEncrypted },
    });

    const { apiTokenEncrypted: _omit, ...rest } = saved;
    return { ...rest, hasToken: true };
  }
}
