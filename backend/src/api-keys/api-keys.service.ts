import * as crypto from 'crypto';
import { BlockList, isIP } from 'net';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { GlobalRole } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { hashToken } from '../common/utils/token-hash.util.js';
import { CreateApiKeyDto } from './dto/create-api-key.dto.js';

const API_KEY_PREFIX = 'pio_';
const API_KEY_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 dias
const LAST_USED_RESOLUTION_MS = 60 * 1000;

/** Campos expostos pela API — o hash nunca sai do banco. */
const SAFE_SELECT = {
  id: true,
  name: true,
  prefix: true,
  expiresAt: true,
  lastUsedAt: true,
  createdAt: true,
  user: { select: { id: true, fullName: true } },
};

/** Extrai a chave de API do header `Authorization`, ou `null` se ele não carregar uma. */
export function readApiKey(authorization: string | undefined): string | null {
  const token = /^Bearer\s+(\S+)$/i.exec(authorization ?? '')?.[1];
  return token?.startsWith(API_KEY_PREFIX) ? token : null;
}

/**
 * `API_KEY_ALLOWED_CIDRS` (ex.: `160.79.104.0/21`, a saída da Anthropic) restringe de onde a chave
 * é aceita; vazio aceita de qualquer lugar. Vale para o MCP e para as rotas REST liberadas.
 */
export function isApiKeyIpAllowed(ip: string | undefined, cidrs = process.env.API_KEY_ALLOWED_CIDRS ?? ''): boolean {
  const ranges = cidrs.split(',').map((c) => c.trim()).filter(Boolean);
  if (ranges.length === 0) return true;
  const address = (ip ?? '').replace(/^::ffff:/, '');
  const family = isIP(address);
  if (!family) return false;
  const list = new BlockList();
  for (const range of ranges) {
    const [network, prefix] = range.split('/');
    const rangeFamily = isIP(network) === 6 ? 'ipv6' : 'ipv4';
    list.addSubnet(network, prefix ? Number(prefix) : rangeFamily === 'ipv6' ? 128 : 32, rangeFamily);
  }
  return list.check(address, family === 6 ? 'ipv6' : 'ipv4');
}

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  /** Chaves do próprio usuário; Admin vê as de todos. */
  list(user: AuthenticatedUser) {
    return this.prisma.apiKey.findMany({
      where: user.globalRole === GlobalRole.ADMIN ? {} : { userId: user.id },
      select: SAFE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Cria a chave e devolve o valor bruto em `token` — única vez em que ele aparece. */
  async create(dto: CreateApiKeyDto, actor: AuthenticatedUser) {
    const userId = dto.userId ?? actor.id;
    if (userId !== actor.id && actor.globalRole !== GlobalRole.ADMIN) {
      throw new ForbiddenException('Só um administrador pode criar chave para outro usuário');
    }
    const owner = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!owner || !owner.isActive || !owner.emailVerifiedAt) {
      throw new NotFoundException('Usuário não encontrado ou inativo');
    }
    // A chave não passa por 2FA, que é obrigatório para Admin.
    if (owner.globalRole === GlobalRole.ADMIN) {
      throw new BadRequestException('Contas de administrador não podem ter chave de API. Use um usuário Senior.');
    }

    const token = API_KEY_PREFIX + crypto.randomBytes(32).toString('base64url');
    const key = await this.prisma.apiKey.create({
      data: {
        userId,
        name: dto.name,
        prefix: token.slice(0, API_KEY_PREFIX.length + 6),
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + API_KEY_TTL_MS),
      },
      select: SAFE_SELECT,
    });
    return { ...key, token };
  }

  /** Revoga (apaga) a chave; o histórico fica na auditoria. */
  async remove(id: string, actor: AuthenticatedUser) {
    const key = await this.prisma.apiKey.findUnique({ where: { id }, select: SAFE_SELECT });
    if (!key || (key.user.id !== actor.id && actor.globalRole !== GlobalRole.ADMIN)) {
      throw new NotFoundException('Chave não encontrada');
    }
    await this.prisma.apiKey.deleteMany({ where: { id } });
    return key;
  }

  /** Valida a chave e devolve o dono, no mesmo formato de `JwtStrategy.validate()`. */
  async authenticate(token: string): Promise<AuthenticatedUser> {
    const key = await this.prisma.apiKey.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    const now = new Date();
    if (
      !key ||
      key.expiresAt <= now ||
      !key.user.isActive ||
      !key.user.emailVerifiedAt ||
      // Cobre quem virou Admin depois de criar a chave.
      key.user.globalRole === GlobalRole.ADMIN
    ) {
      throw new UnauthorizedException('Chave de API inválida ou expirada');
    }

    if (!key.lastUsedAt || now.getTime() - key.lastUsedAt.getTime() > LAST_USED_RESOLUTION_MS) {
      // updateMany: não falha se a chave for revogada neste meio-tempo.
      await this.prisma.apiKey.updateMany({ where: { id: key.id }, data: { lastUsedAt: now } });
    }

    const { id, email, fullName, globalRole, twoFactorEnabled } = key.user;
    return { id, email, fullName, globalRole, twoFactorEnabled };
  }
}
