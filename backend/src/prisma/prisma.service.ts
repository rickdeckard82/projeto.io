import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Wrapper injetável do `PrismaClient`, usado em toda a aplicação como ponto único de acesso ao
 * banco. Estende `PrismaClient` diretamente (em vez de compor) para que os módulos consumidores
 * usem a mesma API do client gerado (`this.prisma.workItem.findMany(...)`, etc.) sem camada
 * extra.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  /**
   * Conecta ao banco explicitamente quando o módulo Nest é inicializado, em vez de depender da
   * conexão lazy do Prisma — assim falhas de conexão aparecem cedo, na subida da aplicação, e não
   * na primeira query feita por um request.
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Encerra a conexão com o banco de forma limpa quando o módulo Nest é destruído (shutdown da
   * aplicação), evitando conexões penduradas no Postgres.
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
