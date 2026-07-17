import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService, AuthTokens } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { TwoFactorEnableDto } from './dto/two-factor-enable.dto';
import { TwoFactorDisableDto } from './dto/two-factor-disable.dto';
import { TwoFactorVerifyDto } from './dto/two-factor-verify.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

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
   * `POST /auth/2fa/verify` junto com o código do app autenticador para completar o login.
   * @param dto - credenciais de login (e-mail e senha)
   * @param res - usado apenas para setar os cookies httpOnly quando o login completa nesta etapa (passthrough)
   * @returns mensagem de confirmação, ou `{ requiresTwoFactor: true, challengeToken }`
   */
  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    if ('requiresTwoFactor' in result) {
      return result;
    }
    setAuthCookies(res, result);
    return { message: 'Login realizado com sucesso' };
  }

  /**
   * Completa o login de uma conta com 2FA ativado: troca o token de desafio + código (do app
   * autenticador ou um código de recuperação) pelos cookies de sessão de verdade.
   * @param dto - token de desafio recebido no `POST /auth/login`, e o código informado pelo usuário
   * @param res - usado apenas para setar os cookies httpOnly (passthrough)
   * @returns mensagem de confirmação
   */
  @Public()
  @Post('2fa/verify')
  async verifyTwoFactor(@Body() dto: TwoFactorVerifyDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.twoFactorService.verifyChallenge(dto.challengeToken, dto.code);
    setAuthCookies(res, tokens);
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
   * Desativa o 2FA da própria conta, mediante confirmação da senha atual.
   * @param dto - senha atual, para confirmar a ação
   * @param user - usuário autenticado
   * @returns mensagem de confirmação
   */
  @Post('2fa/disable')
  async disableTwoFactor(@Body() dto: TwoFactorDisableDto, @CurrentUser() user: AuthenticatedUser) {
    return this.twoFactorService.disable(user.id, dto.password);
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
