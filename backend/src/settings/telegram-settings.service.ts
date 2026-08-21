import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateTelegramSettingsDto } from './dto/update-telegram-settings.dto.js';
import { encrypt } from '../common/utils/crypto.util.js';

const SINGLETON_ID = 'singleton';

/**
 * Gestão da configuração única (singleton) do bot do Telegram usado para enviar notificações. O
 * token nunca é devolvido ao frontend (nem em claro nem criptografado) — só é usado internamente
 * por `TelegramChannelService` ao chamar a Bot API.
 */
@Injectable()
export class TelegramSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Retorna a configuração atual sem o token (substituído por `hasToken`), ou `null` se ainda não configurado. */
  async get() {
    const settings = await this.prisma.telegramSettings.findUnique({ where: { id: SINGLETON_ID } });
    if (!settings) {
      return null;
    }
    const { botTokenEncrypted, ...rest } = settings;
    return { ...rest, hasToken: !!botTokenEncrypted };
  }

  /**
   * Cria ou atualiza a configuração do bot. `botToken` é opcional: se omitido/vazio, mantém o
   * token já salvo (evita forçar o admin a redigitá-lo a cada edição do `botUsername`).
   * @throws BadRequestException - se não houver token informado nem já salvo
   */
  async update(dto: UpdateTelegramSettingsDto) {
    const existing = await this.prisma.telegramSettings.findUnique({ where: { id: SINGLETON_ID } });

    const botTokenEncrypted = dto.botToken ? encrypt(dto.botToken) : existing?.botTokenEncrypted;
    if (!botTokenEncrypted) {
      throw new BadRequestException('Token do bot é obrigatório na primeira configuração');
    }

    const data = {
      botTokenEncrypted,
      botUsername: dto.botUsername !== undefined ? dto.botUsername || null : existing?.botUsername,
    };

    const saved = await this.prisma.telegramSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...data },
      update: data,
    });

    const { botTokenEncrypted: _omit, ...rest } = saved;
    return { ...rest, hasToken: true };
  }
}
