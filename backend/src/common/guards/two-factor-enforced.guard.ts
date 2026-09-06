import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GlobalRole } from '../../generated/prisma/client.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { ALLOW_2FA_SETUP_KEY } from '../decorators/allow-2fa-setup.decorator.js';

/**
 * Guard global (registrado via `APP_GUARD`, depois do `JwtAuthGuard`) que exige 2FA ativo para
 * contas com papel `ADMIN`. Um admin sem `twoFactorEnabled` só consegue acessar as rotas
 * marcadas com `@Allow2faSetup()` (ler a própria conta, configurar/ativar o 2FA, logout) — todo
 * o resto responde `403` com `code: 'TWO_FACTOR_REQUIRED'`, que o frontend usa para levar a
 * pessoa à tela de configuração.
 *
 * Só ADMIN é obrigado (decisão do produto): Senior/Membro/Visualizador seguem com 2FA opcional.
 * Rotas `@Public()` não passam por aqui (não há usuário autenticado para avaliar).
 */
@Injectable()
export class TwoFactorEnforcedGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || user.globalRole !== GlobalRole.ADMIN || user.twoFactorEnabled) {
      return true;
    }

    const allowsSetup = this.reflector.getAllAndOverride<boolean>(ALLOW_2FA_SETUP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowsSetup) {
      return true;
    }

    throw new ForbiddenException({
      statusCode: 403,
      code: 'TWO_FACTOR_REQUIRED',
      message: 'Sua conta de administrador precisa ativar a autenticação de dois fatores para continuar.',
    });
  }
}
