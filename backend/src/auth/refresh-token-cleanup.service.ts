import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

const RETENTION_DAYS = 90;

/**
 * Expurga refresh tokens que já não têm nenhum uso possível (revogados ou naturalmente
 * expirados) há mais de 90 dias — política de retenção (LGPD art. 6, III: necessidade).
 * Um token inválido não serve a nenhuma finalidade depois de expirado/revogado; mantê-lo
 * indefinidamente só acumula dado pessoal sem propósito. Roda uma vez por dia.
 */
@Injectable()
export class RefreshTokenCleanupService {
  private readonly logger = new Logger(RefreshTokenCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanup() {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [{ revokedAt: { lt: cutoff } }, { expiresAt: { lt: cutoff } }],
      },
    });
    if (result.count > 0) {
      this.logger.log(`Removidos ${result.count} refresh token(s) com mais de ${RETENTION_DAYS} dias`);
    }
  }
}
