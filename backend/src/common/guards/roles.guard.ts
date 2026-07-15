import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GlobalRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard global (registrado via `APP_GUARD`) que restringe rotas marcadas com
 * `@Roles(...)` ao conjunto de papéis globais informado. Roda depois do
 * `JwtAuthGuard`, portanto já pode contar com `request.user` preenchido.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Lê os papéis exigidos (metadado `ROLES_KEY`) do handler/classe e compara
   * com o `globalRole` do usuário autenticado. Se a rota não declarar
   * `@Roles(...)`, qualquer usuário autenticado passa (guard vira no-op).
   * @param context - contexto de execução do request atual
   * @returns `true` se a rota não exige papéis específicos ou se o `globalRole` do usuário está entre os exigidos
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<GlobalRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    return !!user && requiredRoles.includes(user.globalRole);
  }
}
