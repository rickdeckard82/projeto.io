import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAllowedDomainDto } from './dto/create-allowed-domain.dto.js';

/**
 * Gestão da lista de domínios de e-mail autorizados a se autocadastrar (`/auth/register`).
 * Domínios são sempre comparados/gravados em minúsculas, sem espaços nas pontas.
 */
@Injectable()
export class AllowedDomainsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista todos os domínios permitidos, ordenados por data de criação. */
  async list() {
    return this.prisma.allowedDomain.findMany({ orderBy: { createdAt: 'asc' } });
  }

  /**
   * Adiciona um novo domínio permitido.
   * @throws ConflictException - quando o domínio já está na lista.
   */
  async create(dto: CreateAllowedDomainDto) {
    const domain = dto.domain.trim().toLowerCase();
    const existing = await this.prisma.allowedDomain.findUnique({ where: { domain } });
    if (existing) {
      throw new ConflictException('Este domínio já está na lista de permitidos');
    }
    return this.prisma.allowedDomain.create({ data: { domain } });
  }

  /**
   * Remove um domínio da lista de permitidos.
   * @throws NotFoundException - quando não existe domínio com o id informado.
   */
  async remove(id: string) {
    const existing = await this.prisma.allowedDomain.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Domínio não encontrado');
    }
    await this.prisma.allowedDomain.delete({ where: { id } });
    return { message: 'Domínio removido' };
  }

  /** Verifica se um domínio de e-mail (já em minúsculas) está na lista de permitidos. */
  async isAllowed(domain: string): Promise<boolean> {
    const found = await this.prisma.allowedDomain.findUnique({ where: { domain: domain.toLowerCase() } });
    return !!found;
  }
}
