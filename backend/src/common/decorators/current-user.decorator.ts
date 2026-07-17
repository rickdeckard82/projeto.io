import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GlobalRole } from '../../generated/prisma/client.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  globalRole: GlobalRole;
}

/**
 * Decorator de parâmetro que injeta o usuário autenticado diretamente no
 * handler do controller, lendo `request.user` — objeto anexado pelo Passport
 * a partir do retorno de `JwtStrategy.validate()` após o `JwtAuthGuard`
 * validar o JWT. Evita repetir `ctx.switchToHttp().getRequest().user` em
 * cada controller.
 * @returns o usuário autenticado (`AuthenticatedUser`) do request atual
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
