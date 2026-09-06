import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface JwtAccessPayload {
  sub: string;
  email: string;
}

/**
 * Estratégia Passport usada pelo `JwtAuthGuard` para autenticar requests via
 * JWT de acesso. Suporta dois transportes do token, nessa ordem de
 * prioridade: o cookie httpOnly `access_token` (uso normal do frontend web)
 * e, como fallback, o header `Authorization: Bearer` (útil para chamadas
 * programáticas/testes que não carregam cookies).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  /**
   * Configura o Passport para extrair o token do cookie ou do header Bearer
   * e validar a assinatura/expiração com o segredo de access token.
   */
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => req?.cookies?.access_token || null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    });
  }

  /**
   * Chamado pelo Passport após verificar a assinatura/expiração do JWT.
   * Recarrega o usuário do banco (em vez de confiar cegamente no payload)
   * para garantir que contas desativadas percam acesso imediatamente, mesmo
   * com um access token ainda válido. O objeto retornado é anexado pelo
   * Passport a `req.user`, consumido depois por `@CurrentUser()`, `RolesGuard`
   * e `ProjectMemberGuard`.
   * @param payload - payload decodificado do JWT de acesso (`sub`, `email`)
   * @returns dados públicos do usuário, que se tornam `req.user`
   * @throws UnauthorizedException - quando o usuário não existe mais ou está inativo
   */
  async validate(payload: JwtAccessPayload) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive || !user.emailVerifiedAt) {
      throw new UnauthorizedException('Usuário inválido ou inativo');
    }
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      globalRole: user.globalRole,
      twoFactorEnabled: user.twoFactorEnabled,
    };
  }
}
