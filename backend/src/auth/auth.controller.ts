import { Body, Controller, Delete, Get, Param, Post, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService, AuthTokens } from './auth.service.js';
import { TwoFactorService } from './two-factor.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { TwoFactorEnableDto } from './dto/two-factor-enable.dto.js';
import { TwoFactorDisableDto } from './dto/two-factor-disable.dto.js';
import { TwoFactorVerifyDto } from './dto/two-factor-verify.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';
const DEVICE_COOKIE = 'device_token';
/** Deve bater com `DEVICE_TRUST_TTL_MS` em `TwoFactorService`. */
const DEVICE_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

/**
 * Grava o par de tokens de sessão como cookies httpOnly na resposta.
 * `httpOnly` impede acesso via JavaScript no browser (mitiga XSS), e
 * `secure` é ligado apenas em produção (em dev, sobre HTTP puro, o cookie
 * `secure` seria descartado pelo navegador). Cada cookie tem `maxAge`
 * alinhado ao tempo de vida do respectivo token (access curto, refresh longo).
 * @param res - resposta Express na qual os cookies serão setados
 * @param tokens - par `{ accessToken, refreshToken }` retornado pelo AuthService
 */
function setAuthCookies(res: Response, tokens: AuthTokens) {
  const secure = process.env.NODE_ENV === 'production';
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: 15 * 60 * 1000,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

/**
 * Rotas de autenticação: cadastro, login, refresh de sessão, logout e leitura
 * do usuário autenticado. As rotas que ainda não têm uma sessão (`register`,
 * `login`, `refresh`) são marcadas `@Public()` para pular o `JwtAuthGuard`.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  /**
   * Cadastra um novo usuário. Não inicia sessão automaticamente: a conta só fica
   * utilizável depois que o e-mail de confirmação (enviado aqui) é confirmado via
   * `GET /auth/verify-email`.
   * @param dto - dados de cadastro (e-mail, senha, nome)
   * @returns mensagem pedindo confirmação por e-mail
   */
  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * Confirma o e-mail de um usuário a partir do link enviado no cadastro/reenvio.
   * @param token - token bruto recebido na query string do link de confirmação
   * @returns mensagem de confirmação
   */
  @Public()
  @Get('verify-email')
  async verifyEmail(@Query('token') token?: string) {
    return this.authService.verifyEmail(token);
  }

  /**
   * Reenvia o e-mail de confirmação de cadastro para uma conta ainda não verificada.
   * @param dto - e-mail da conta
   * @returns mensagem genérica (não revela se o e-mail existe/já está confirmado)
   */
  @Public()
  @Post('resend-verification')
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  /**
   * Autentica um usuário existente. Se a conta não tiver 2FA ativado, já inicia a sessão
   * (cookies de access/refresh token). Se tiver, **não** seta cookie nenhum ainda — devolve
   * `requiresTwoFactor: true` + um token de desafio de uso único, que o frontend envia para
   * `POST /auth/2fa/verify` junto com o código do app autenticador para completar o login — a
   * menos que o cookie `device_token` já identifique este dispositivo como confiável (ver
   * `AuthService.login`), caso em que o desafio é pulado e a sessão já começa aqui.
   * @param dto - credenciais de login (e-mail e senha)
   * @param req - usado apenas para ler o cookie `device_token`, se presente
   * @param res - usado apenas para setar os cookies httpOnly quando o login completa nesta etapa (passthrough)
   * @returns mensagem de confirmação, ou `{ requiresTwoFactor: true, challengeToken }`
   */
  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto, req.cookies?.[DEVICE_COOKIE]);
    if ('requiresTwoFactor' in result) {
      return result;
    }
    setAuthCookies(res, result);
    return { message: 'Login realizado com sucesso' };
  }

  /**
   * Completa o login de uma conta com 2FA ativado: troca o token de desafio + código (do app
   * autenticador ou um código de recuperação) pelos cookies de sessão de verdade. Se
   * `dto.rememberDevice` vier marcado, também grava um cookie `device_token` (30 dias) que faz
   * `POST /auth/login` pular o desafio de 2FA neste mesmo navegador enquanto ele durar.
   * @param dto - token de desafio recebido no `POST /auth/login`, o código informado pelo usuário, e se deve lembrar este dispositivo
   * @param req - usado apenas para ler o `User-Agent` (guardado no `TrustedDevice`, só para exibição futura)
   * @param res - usado para setar os cookies httpOnly (passthrough)
   * @returns mensagem de confirmação
   */
  @Public()
  @Post('2fa/verify')
  async verifyTwoFactor(@Body() dto: TwoFactorVerifyDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { deviceToken, ...tokens } = await this.twoFactorService.verifyChallenge(
      dto.challengeToken,
      dto.code,
      dto.rememberDevice,
      req.get('user-agent'),
    );
    setAuthCookies(res, tokens);
    if (deviceToken) {
      const secure = process.env.NODE_ENV === 'production';
      res.cookie(DEVICE_COOKIE, deviceToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure,
        maxAge: DEVICE_TOKEN_MAX_AGE_MS,
      });
    }
    return { message: 'Login realizado com sucesso' };
  }

  /**
   * Inicia a configuração de 2FA da própria conta: gera um novo segredo TOTP e devolve o QR
   * code para escanear (mais o segredo em texto, como alternativa de entrada manual).
   * @param user - usuário autenticado
   * @returns `{ qrCodeDataUrl, secret }`
   */
  @Post('2fa/setup')
  async setupTwoFactor(@CurrentUser() user: AuthenticatedUser) {
    return this.twoFactorService.setup(user.id);
  }

  /**
   * Confirma a configuração pendente de 2FA com um código do app autenticador, ativando-o.
   * @param dto - código de 6 dígitos gerado pelo app
   * @param user - usuário autenticado
   * @returns mensagem de confirmação e os códigos de recuperação (mostrados só uma vez)
   */
  @Post('2fa/enable')
  async enableTwoFactor(@Body() dto: TwoFactorEnableDto, @CurrentUser() user: AuthenticatedUser) {
    return this.twoFactorService.enable(user.id, dto.code);
  }

  /**
   * Desativa o 2FA da própria conta, mediante confirmação da senha atual. Também limpa o cookie
   * `device_token` deste navegador — os registros `TrustedDevice` já foram apagados no service,
   * então o cookie ficaria só como lixo inútil se não fosse limpo aqui.
   * @param dto - senha atual, para confirmar a ação
   * @param user - usuário autenticado
   * @param res - usado apenas para limpar o cookie `device_token` (passthrough)
   * @returns mensagem de confirmação
   */
  @Post('2fa/disable')
  async disableTwoFactor(
    @Body() dto: TwoFactorDisableDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.twoFactorService.disable(user.id, dto.password);
    res.clearCookie(DEVICE_COOKIE);
    return result;
  }

  /**
   * Esquece todos os dispositivos marcados como confiáveis na conta (ver
   * `TwoFactorService.verifyChallenge`), sem desativar o 2FA em si.
   * @param user - usuário autenticado
   * @param res - usado apenas para limpar o cookie `device_token` deste navegador (passthrough)
   * @returns mensagem de confirmação
   */
  @Post('2fa/trusted-devices/forget')
  async forgetTrustedDevices(@CurrentUser() user: AuthenticatedUser, @Res({ passthrough: true }) res: Response) {
    const result = await this.twoFactorService.forgetDevices(user.id);
    res.clearCookie(DEVICE_COOKIE);
    return result;
  }

  /**
   * Lista os dispositivos marcados como confiáveis na conta (ver `TwoFactorService.verifyChallenge`),
   * mais recentes primeiro, sinalizando qual deles é o navegador que está fazendo esta própria
   * requisição (`isCurrent`).
   * @param user - usuário autenticado
   * @param req - usado apenas para ler o cookie `device_token` deste navegador, e saber qual dispositivo da lista é "este"
   * @returns lista de dispositivos confiáveis (sem o hash do token, nunca exposto)
   */
  @Get('2fa/trusted-devices')
  async listTrustedDevices(@CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.twoFactorService.listDevices(user.id, req.cookies?.[DEVICE_COOKIE]);
  }

  /**
   * Esquece um único dispositivo confiável pelo id. Se for o próprio dispositivo desta
   * requisição, limpa também o cookie `device_token` deste navegador.
   * @param id - id do `TrustedDevice` a remover
   * @param user - usuário autenticado
   * @param req - usado apenas para ler o cookie `device_token` deste navegador, e saber se é o dispositivo removido
   * @param res - usado apenas para limpar o cookie `device_token`, quando aplicável (passthrough)
   * @returns mensagem de confirmação
   * @throws NotFoundException - dispositivo inexistente, ou pertencente a outro usuário
   */
  @Delete('2fa/trusted-devices/:id')
  async revokeTrustedDevice(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.twoFactorService.revokeDevice(user.id, id, req.cookies?.[DEVICE_COOKIE]);
    if (result.wasCurrentDevice) {
      res.clearCookie(DEVICE_COOKIE);
    }
    return { message: result.message };
  }

  /**
   * Renova a sessão a partir do refresh token do cookie, rotacionando-o e
   * regravando ambos os cookies com os novos tokens. É pública porque é
   * chamada justamente quando o access token expirou (interceptor do
   * frontend chama esta rota em qualquer 401).
   * @param req - usado apenas para ler o cookie `refresh_token`
   * @param res - usado apenas para setar os novos cookies httpOnly (passthrough)
   * @returns mensagem de confirmação
   */
  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.refresh(req.cookies?.[REFRESH_COOKIE]);
    setAuthCookies(res, tokens);
    return { message: 'Token renovado' };
  }

  /**
   * Encerra a sessão: revoga o refresh token no banco e limpa os cookies de
   * access/refresh no navegador. Requer autenticação (não é `@Public()`).
   * @param req - usado apenas para ler o cookie `refresh_token`
   * @param res - usado apenas para limpar os cookies httpOnly (passthrough)
   * @returns mensagem de confirmação
   */
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(ACCESS_COOKIE);
    res.clearCookie(REFRESH_COOKIE);
    return { message: 'Sessão encerrada' };
  }

  /**
   * Retorna os dados do usuário autenticado atual, usado pelo frontend para
   * hidratar o `AuthContext` no carregamento da aplicação.
   * @param user - usuário autenticado injetado pelo `@CurrentUser()` (via JwtAuthGuard/JwtStrategy)
   * @returns dados públicos do usuário autenticado
   */
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.id);
  }
}
