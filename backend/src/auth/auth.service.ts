import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { GlobalRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Concentra toda a lógica de autenticação: cadastro, login, emissão e rotação
 * de tokens JWT, logout e leitura do usuário autenticado. Access tokens são
 * de curta duração e stateless; refresh tokens são persistidos (em forma de
 * hash) em `refresh_tokens` para permitir revogação individual (logout) e
 * rotação a cada uso, reduzindo o impacto de um refresh token vazado.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Cria um novo usuário com papel global `MEMBER` e já emite o par de
   * tokens de acesso/refresh, autenticando-o imediatamente após o cadastro.
   * @param dto - e-mail, senha em texto plano e nome completo do novo usuário
   * @returns par `{ accessToken, refreshToken }` da sessão recém-criada
   * @throws ConflictException - quando já existe um usuário com o mesmo e-mail
   */
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Este e-mail já está cadastrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        globalRole: GlobalRole.MEMBER,
      },
    });

    return this.issueTokens(user.id, user.email);
  }

  /**
   * Autentica um usuário existente por e-mail/senha e emite um novo par de
   * tokens. Usa uma mensagem de erro genérica para credenciais inválidas e
   * usuário inativo/inexistente, evitando vazar qual das duas condições falhou
   * (proteção contra enumeração de e-mails cadastrados).
   * @param dto - e-mail e senha em texto plano informados no login
   * @returns par `{ accessToken, refreshToken }` da nova sessão
   * @throws UnauthorizedException - credenciais inválidas, usuário inexistente ou inativo
   */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.issueTokens(user.id, user.email);
  }

  /**
   * Troca um refresh token válido por um novo par de tokens, implementando
   * rotação: o refresh token usado é imediatamente revogado (`revokedAt`)
   * antes de um novo ser emitido, de forma que cada refresh token só possa
   * ser resgatado uma única vez — se um token revogado for reapresentado
   * (ex.: token roubado sendo reutilizado após o legítimo já ter rotacionado),
   * isso é tratado como token inválido/expirado.
   * @param rawRefreshToken - refresh token bruto (JWT) lido do cookie `refresh_token`
   * @returns novo par `{ accessToken, refreshToken }`
   * @throws UnauthorizedException - token ausente, malformado, expirado, revogado ou de usuário inativo/inexistente
   */
  async refresh(rawRefreshToken: string | undefined): Promise<AuthTokens> {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token ausente');
    }

    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(rawRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId: payload.sub, tokenHash, revokedAt: null },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuário inválido');
    }

    // Rotate: revoke old, issue new
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(user.id, user.email);
  }

  /**
   * Revoga o refresh token da sessão atual (marcando `revokedAt`), invalidando
   * qualquer tentativa futura de renová-lo. É silencioso quando não há token
   * (ex.: logout chamado sem cookie de refresh) para manter o logout idempotente.
   * @param rawRefreshToken - refresh token bruto (JWT) lido do cookie `refresh_token`
   */
  async logout(rawRefreshToken: string | undefined) {
    if (!rawRefreshToken) {
      return;
    }
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Retorna os dados públicos do usuário autenticado, usado pela rota `GET /auth/me`.
   * @param userId - id do usuário extraído do payload do JWT de acesso
   * @returns dados básicos do usuário (id, e-mail, nome, avatar, papel global)
   * @throws UnauthorizedException - quando o id não corresponde a nenhum usuário (ex.: usuário removido após o token ser emitido)
   */
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      globalRole: user.globalRole,
    };
  }

  /**
   * Gera o par de tokens de uma sessão (access + refresh) e persiste o
   * refresh token (como hash, nunca em texto plano) para permitir revogação
   * e rotação futuras. Usado por `register`, `login` e `refresh`.
   * @param userId - id do usuário para quem os tokens serão emitidos
   * @param email - e-mail do usuário, embutido apenas no access token
   * @returns par `{ accessToken, refreshToken }` assinados
   */
  private async issueTokens(userId: string, email: string): Promise<AuthTokens> {
    const accessToken = this.jwtService.sign(
      { sub: userId, email },
      { secret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret', expiresIn: ACCESS_TOKEN_TTL },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId },
      {
        secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
        expiresIn: Math.floor(REFRESH_TOKEN_TTL_MS / 1000),
      },
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Aplica SHA-256 sobre o refresh token antes de gravá-lo no banco. Como o
   * refresh token em si já concede uma nova sessão a quem o possuir, ele nunca
   * é armazenado em texto plano — assim, um vazamento do banco de dados não
   * permite reconstruir os tokens originais nem impersonar usuários.
   * @param token - refresh token bruto (JWT) em texto plano
   * @returns hash SHA-256 hexadecimal do token
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
