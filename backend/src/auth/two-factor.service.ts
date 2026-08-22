import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService, AuthTokens } from './auth.service.js';
import { encrypt, decrypt } from '../common/utils/crypto.util.js';
import { hashToken } from '../common/utils/token-hash.util.js';
import { TWO_FACTOR_CHALLENGE_PURPOSE } from './two-factor-challenge.constants.js';

const RECOVERY_CODE_COUNT = 8;
/** Deve bater com o `maxAge` do cookie `device_token` setado em `AuthController.verifyTwoFactor`. */
const DEVICE_TRUST_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

/** Gera um código de recuperação legível (ex.: `A1B2C-D3E4F`); 10 caracteres hexadecimais em maiúsculas, exibido em dois blocos. */
function generateRecoveryCode(): string {
  const raw = crypto.randomBytes(5).toString('hex').toUpperCase();
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

/** Remove tudo que não for letra/número antes de hashear/comparar um código de recuperação — tolera o usuário digitar com ou sem o traço. */
function normalizeRecoveryCode(code: string): string {
  return code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

/**
 * Autenticação de dois fatores por TOTP (Google Authenticator, Authy, etc.), opcional por
 * usuário — ativada/desativada em Configurações → Segurança. O segredo fica criptografado em
 * repouso (`crypto.util.ts`, mesmo esquema já usado para a senha do SMTP); os códigos de
 * recuperação ficam só como hash (`token-hash.util.ts`), nunca em texto plano, e cada um vale
 * uma única vez.
 */
@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Inicia a configuração: gera um novo segredo TOTP e o salva criptografado (mas
   * `twoFactorEnabled` só vira `true` em {@link enable}, depois de confirmado com um código
   * válido). Chamar de novo antes de confirmar simplesmente substitui o segredo pendente.
   * @param userId - usuário autenticado que está configurando 2FA
   * @returns QR code (data URL PNG) para escanear com o app autenticador, e o segredo em texto para entrada manual
   * @throws NotFoundException - usuário não encontrado
   * @throws ConflictException - 2FA já está ativado para essa conta
   */
  async setup(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (user.twoFactorEnabled) {
      throw new ConflictException(
        'A autenticação de dois fatores já está ativada. Desative antes de configurar novamente.',
      );
    }

    const secret = authenticator.generateSecret();
    await this.prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: encrypt(secret) } });

    const otpauth = authenticator.keyuri(user.email, 'Projeto.io', secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

    return { qrCodeDataUrl, secret };
  }

  /**
   * Confirma a configuração pendente: valida o código gerado pelo app contra o segredo salvo em
   * {@link setup} e, se bater, liga `twoFactorEnabled` e gera os códigos de recuperação (mostrados
   * uma única vez nesta resposta — depois só existe o hash deles).
   * @param userId - usuário autenticado
   * @param code - código de 6 dígitos gerado pelo app autenticador
   * @returns mensagem de confirmação e os códigos de recuperação em texto puro
   * @throws BadRequestException - sem configuração pendente (chame {@link setup} antes), ou código inválido
   */
  async enable(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) {
      throw new BadRequestException('Inicie a configuração do 2FA antes de confirmar o código.');
    }

    const valid = authenticator.verify({ token: code, secret: decrypt(user.twoFactorSecret) });
    if (!valid) {
      throw new BadRequestException('Código inválido. Confira o horário do seu dispositivo e tente novamente.');
    }

    const rawCodes = Array.from({ length: RECOVERY_CODE_COUNT }, generateRecoveryCode);
    const hashedCodes = rawCodes.map((c) => hashToken(normalizeRecoveryCode(c)));

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true, twoFactorRecoveryCodes: hashedCodes },
    });

    return { message: 'Autenticação de dois fatores ativada.', recoveryCodes: rawCodes };
  }

  /**
   * Desativa o 2FA da própria conta. Exige a senha atual (não basta estar logado) para que
   * alguém com uma sessão já aberta não consiga desligar essa proteção sem confirmar quem é.
   * Também apaga todos os dispositivos confiáveis da conta — a confiança foi concedida por causa
   * do 2FA, então não deveria sobreviver a ele nem ser herdada silenciosamente se o 2FA for
   * reativado depois.
   * @param userId - usuário autenticado
   * @param password - senha atual em texto plano, para confirmar a ação
   * @returns mensagem de confirmação
   * @throws NotFoundException - usuário não encontrado
   * @throws UnauthorizedException - senha incorreta
   */
  async disable(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Senha incorreta');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorRecoveryCodes: [] },
      }),
      this.prisma.trustedDevice.deleteMany({ where: { userId } }),
    ]);

    return { message: 'Autenticação de dois fatores desativada.' };
  }

  /**
   * Esquece todos os dispositivos marcados como confiáveis na conta (ver {@link verifyChallenge}),
   * sem mexer no 2FA em si — todo login futuro volta a pedir o código, em qualquer dispositivo,
   * até a pessoa marcar "lembrar" de novo.
   * @param userId - usuário autenticado
   * @returns mensagem de confirmação
   */
  async forgetDevices(userId: string) {
    await this.prisma.trustedDevice.deleteMany({ where: { userId } });
    return { message: 'Dispositivos confiáveis esquecidos.' };
  }

  /**
   * Completa o login de uma conta com 2FA: valida o token de desafio (assinado dentro de
   * `AuthService.login` com a marca {@link TWO_FACTOR_CHALLENGE_PURPOSE}), depois o código informado —
   * primeiro como TOTP, e se não bater, como código de recuperação (consumido/invalidado no uso).
   * Só então emite os tokens de sessão de verdade.
   * @param challengeToken - token de desafio recebido na primeira etapa do login
   * @param code - código de 6 dígitos do app autenticador, ou um código de recuperação
   * @param rememberDevice - quando `true`, grava um `TrustedDevice` (30 dias) e devolve `deviceToken` para o controller setar como cookie — próximos logins nesse dispositivo pulam o desafio (ver `AuthService.login`)
   * @param userAgent - `User-Agent` da requisição, só para exibição futura no `TrustedDevice` gravado
   * @returns par `{ accessToken, refreshToken }` da nova sessão, com `deviceToken` quando `rememberDevice` for `true`
   * @throws UnauthorizedException - token de desafio ausente/expirado/inválido, conta sem 2FA ativo, ou código incorreto
   */
  async verifyChallenge(
    challengeToken: string,
    code: string,
    rememberDevice?: boolean,
    userAgent?: string,
  ): Promise<AuthTokens & { deviceToken?: string }> {
    let payload: { sub: string; purpose?: string };
    try {
      payload = this.jwtService.verify(challengeToken, {
        secret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
      });
    } catch {
      throw new UnauthorizedException('Sessão de verificação expirada. Faça login novamente.');
    }
    if (payload.purpose !== TWO_FACTOR_CHALLENGE_PURPOSE) {
      throw new UnauthorizedException('Token de verificação inválido');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException('Não foi possível completar a verificação');
    }

    if (authenticator.verify({ token: code, secret: decrypt(user.twoFactorSecret) })) {
      return this.completeLogin(user.id, user.email, rememberDevice, userAgent);
    }

    const normalized = hashToken(normalizeRecoveryCode(code));
    if (user.twoFactorRecoveryCodes.includes(normalized)) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { twoFactorRecoveryCodes: user.twoFactorRecoveryCodes.filter((c) => c !== normalized) },
      });
      return this.completeLogin(user.id, user.email, rememberDevice, userAgent);
    }

    throw new UnauthorizedException('Código inválido');
  }

  /**
   * Emite a sessão de verdade após o 2FA validar, e opcionalmente grava um `TrustedDevice` para
   * pular o desafio nos próximos logins desse mesmo dispositivo (ver {@link verifyChallenge}).
   */
  private async completeLogin(
    userId: string,
    email: string,
    rememberDevice: boolean | undefined,
    userAgent: string | undefined,
  ): Promise<AuthTokens & { deviceToken?: string }> {
    const tokens = await this.authService.issueTokens(userId, email);
    if (!rememberDevice) {
      return tokens;
    }

    const deviceToken = crypto.randomBytes(32).toString('hex');
    await this.prisma.trustedDevice.create({
      data: {
        userId,
        tokenHash: hashToken(deviceToken),
        userAgent,
        expiresAt: new Date(Date.now() + DEVICE_TRUST_TTL_MS),
      },
    });

    return { ...tokens, deviceToken };
  }
}
