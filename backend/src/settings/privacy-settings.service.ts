import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePrivacySettingsDto } from './dto/update-privacy-settings.dto';

const SINGLETON_ID = 'singleton';

/**
 * Gestão da configuração única (singleton) de privacidade/LGPD — quem é o controlador dos
 * dados e o contato do encarregado (DPO), usados para montar a página pública de Política de
 * Privacidade. Deliberadamente configurável em vez de fixa no código: este software é
 * reutilizável por qualquer organização que suba os próprios containers, então não faz sentido
 * hardcodar uma empresa específica como controlador. Todos os campos são opcionais — enquanto
 * não preenchidos, a página pública indica que a informação ainda não foi configurada.
 */
@Injectable()
export class PrivacySettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Retorna a configuração atual, ou `null` se ainda não houver nenhuma. Não tem dado sensível — é sempre destinada a ser pública. */
  async get() {
    return this.prisma.privacySettings.findUnique({ where: { id: SINGLETON_ID } });
  }

  /** Cria ou atualiza a configuração de privacidade/LGPD. Restrito a administradores no controller. */
  async update(dto: UpdatePrivacySettingsDto) {
    return this.prisma.privacySettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...dto },
      update: dto,
    });
  }
}
