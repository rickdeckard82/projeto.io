import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { GlobalRole } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { MailerService } from '../mail/mailer.service.js';
import { hashToken } from '../common/utils/token-hash.util.js';
import { TWO_FACTOR_CHALLENGE_PURPOSE } from './two-factor-challenge.constants.js';

const TWO_FACTOR_CHALLENGE_TTL = '5m';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const VERIFICATION_TOKEN_TTL_MS = 48 * 60 * 60 * 1000; // 48 horas
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 segundos

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Concentra toda a lógica de autenticação: cadastro (restrito por domínio de e-mail permitido
 * e sujeito a confirmação por e-mail), login, emissão e rotação de tokens JWT, logout e
 * leitura do usuário autenticado. Access tokens são de curta duração e stateless; refresh
 * tokens são persistidos (em forma de hash) em `refresh_tokens` para permitir revogação
 * individual (logout) e rotação a cada uso, reduzindo o impacto de um refresh token vazado.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}

  /**
   * Cria um novo usuário com papel global `MEMBER`, mas **não** o autentica imediatamente:
   * o e-mail precisa pertencer a um domínio previamente liberado em `/settings/allowed-domains`
   * e o servidor de SMTP precisa estar configurado; a conta só fica utilizável (login liberado)
   * depois que o usuário confirma o link enviado por e-mail (`verifyEmail`).
   * @param dto - e-mail, senha em texto plano e nome completo do novo usuário
   * @returns mensagem pedindo para o usuário verificar o e-mail
   * @throws ConflictException - quando já existe um usuário com o mesmo e-mail
   * @throws ForbiddenException - quando o domínio do e-mail não está na lista de permitidos
   * @throws ServiceUnavailableException - quando o SMTP não está configurado, ou o envio do e-mail falha
   */
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Este e-mail já está cadastrado');
    }

    const domain = dto.email.split('@')[1]?.toLowerCase();
    const allowed = domain ? await this.prisma.allowedDomain.findUnique({ where: { domain } }) : null;
    if (!allowed) {
      throw new ForbiddenException(
        'Cadastro não permitido para este domínio de e-mail. Contate um administrador.',
      );
    }

    const smtpConfigured = await this.prisma.smtpSettings.findUnique({ where: { id: 'singleton' } });
    if (!smtpConfigured) {
      throw new ServiceUnavailableException(
        'Cadastro temporariamente indisponível: servidor de e-mail não configurado. Contate um administrador.',
      );
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

    try {
      await this.generateAndSendVerification(user.id, user.email, user.fullName);
    } catch (err) {
      // Sem confirmação enviada, a conta nunca poderia ser ativada — melhor não deixá-la
      // criada do que travar um usuário para sempre em estado não-confirmável.
      this.logger.error('Falha ao enviar e-mail de confirmação no cadastro', err instanceof Error ? err.stack : err);
      await this.prisma.user.delete({ where: { id: user.id } });
      throw new ServiceUnavailableException(
        'Não foi possível enviar o e-mail de confirmação. Tente novamente mais tarde ou contate um administrador.',
      );
    }

    return { message: 'Cadastro realizado. Verifique seu e-mail para ativar sua conta.' };
  }

  /**
   * Autentica um usuário existente por e-mail/senha. Além do usuário inativo/inexistente
   * (mensagem genérica, para não vazar qual condição falhou), um e-mail ainda não confirmado
   * também bloqueia o login — mas com uma mensagem específica, checada só depois da senha
   * validar, para não revelar o estado de contas de terceiros. Se a conta tiver 2FA ativado, não
   * emite os tokens de sessão ainda: devolve um token de desafio de uso único (verificado depois
   * por `TwoFactorService.verifyChallenge`) para completar o login na segunda etapa (código do
   * app autenticador) — a menos que `deviceToken` bata com um `TrustedDevice` ainda válido daquele
   * usuário, caso em que o desafio é pulado e a sessão já é emitida aqui mesmo.
   * @param dto - e-mail e senha em texto plano informados no login
   * @param deviceToken - token bruto do cookie `device_token`, se presente (dispositivo pode já ter sido lembrado num 2FA anterior — ver `TwoFactorService.verifyChallenge`)
   * @returns par `{ accessToken, refreshToken }` da nova sessão, ou `{ requiresTwoFactor: true, challengeToken }` se a conta tiver 2FA ativado e o dispositivo não for um já lembrado
   * @throws UnauthorizedException - credenciais inválidas, usuário inexistente/inativo, ou e-mail não confirmado
   */
  async login(
    dto: LoginDto,
    deviceToken?: string,
  ): Promise<AuthTokens | { requiresTwoFactor: true; challengeToken: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException('Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.');
    }

    if (user.twoFactorEnabled) {
      const trustedDevice =
        deviceToken &&
        (await this.prisma.trustedDevice.findFirst({
          where: { userId: user.id, tokenHash: hashToken(deviceToken), expiresAt: { gt: new Date() } },
        }));
      if (trustedDevice) {
        return this.issueTokens(user.id, user.email);
      }

      const challengeToken = this.jwtService.sign(
        { sub: user.id, purpose: TWO_FACTOR_CHALLENGE_PURPOSE },
        { secret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret', expiresIn: TWO_FACTOR_CHALLENGE_TTL },
      );
      return { requiresTwoFactor: true, challengeToken };
    }

    return this.issueTokens(user.id, user.email);
  }

  /**
   * Confirma o e-mail de um usuário a partir do token recebido por link, liberando o login.
   * Não autentica automaticamente — o usuário ainda precisa fazer login normalmente depois.
   * @param rawToken - token bruto (não hash) recebido na query string do link de confirmação
   * @returns mensagem de confirmação
   * @throws BadRequestException - token ausente, inválido ou expirado
   */
  async verifyEmail(rawToken: string | undefined) {
    if (!rawToken) {
      throw new BadRequestException('Token ausente');
    }

    const tokenHash = hashToken(rawToken);
    const user = await this.prisma.user.findFirst({ where: { verificationTokenHash: tokenHash } });
    if (!user) {
      throw new BadRequestException('Token inválido');
    }
    if (!user.verificationTokenExpiresAt || user.verificationTokenExpiresAt < new Date()) {
      throw new BadRequestException('Token expirado. Solicite um novo e-mail de confirmação.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date(), verificationTokenHash: null, verificationTokenExpiresAt: null },
    });

    return { message: 'E-mail confirmado com sucesso' };
  }

  /**
   * Reenvia o e-mail de confirmação de cadastro, gerando um novo token (invalidando o anterior).
   * Responde sempre com a mesma mensagem genérica, exista ou não o e-mail, já esteja ou não
   * verificado, para não permitir enumeração de contas cadastradas.
   * @param email - e-mail informado pelo usuário para reenvio
   * @returns mensagem genérica de confirmação
   */
  async resendVerification(email: string) {
    const generic = {
      message: 'Se o e-mail existir e estiver pendente de confirmação, um novo link foi enviado.',
    };

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerifiedAt) {
      return generic;
    }
    if (user.verificationEmailSentAt && Date.now() - user.verificationEmailSentAt.getTime() < RESEND_COOLDOWN_MS) {
      return generic;
    }

    try {
      await this.generateAndSendVerification(user.id, user.email, user.fullName);
    } catch (err) {
      // Falha de envio no reenvio não deve expor detalhes ao chamador (mesma resposta genérica).
      this.logger.error('Falha ao enviar e-mail de confirmação no reenvio', err instanceof Error ? err.stack : err);
    }

    return generic;
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

    const tokenHashValue = hashToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId: payload.sub, tokenHash: tokenHashValue, revokedAt: null },
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
    const tokenHashValue = hashToken(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: tokenHashValue, revokedAt: null },
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
      twoFactorEnabled: user.twoFactorEnabled,
      timezone: user.timezone,
    };
  }

  /**
   * Gera um novo token de confirmação de e-mail (bruto, de uso único), grava seu hash + validade
   * de 48h no usuário e envia o e-mail de confirmação via `MailerService`. Usada tanto pelo
   * cadastro inicial quanto pelo reenvio.
   * @param userId - id do usuário
   * @param email - e-mail de destino
   * @param fullName - nome do usuário, usado na saudação do e-mail
   */
  private async generateAndSendVerification(userId: string, email: string, fullName: string) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        verificationTokenHash: hashToken(rawToken),
        verificationTokenExpiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
        verificationEmailSentAt: new Date(),
      },
    });
    await this.mailerService.sendVerificationEmail(email, fullName, rawToken);
  }

  /**
   * Gera o par de tokens de uma sessão (access + refresh) e persiste o
   * refresh token (como hash, nunca em texto plano) para permitir revogação
   * e rotação futuras. Usado por `login`/`refresh`, e por `TwoFactorService.verifyChallenge`
   * (não é `private` por causa desse último caso — só quem já validou credenciais/2FA deve
   * chamar isso, então continua não exposto por nenhuma rota diretamente).
   * @param userId - id do usuário para quem os tokens serão emitidos
   * @param email - e-mail do usuário, embutido apenas no access token
   * @returns par `{ accessToken, refreshToken }` assinados
   */
  async issueTokens(userId: string, email: string): Promise<AuthTokens> {
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
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return { accessToken, refreshToken };
  }
}
