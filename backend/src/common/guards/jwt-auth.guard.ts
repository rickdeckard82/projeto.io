import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Guard global (registrado via `APP_GUARD`) que exige um JWT de acesso válido
 * em toda rota, exceto as marcadas com `@Public()`. Antes de delegar para a
 * estratégia Passport (`JwtStrategy`), verifica os metadados `IS_PUBLIC_KEY`
 * no handler e na classe — se presentes, libera o acesso sem autenticar.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  /**
   * Decide se a rota exige autenticação. Rotas `@Public()` pulam a validação
   * do JWT; todas as demais são validadas pela estratégia `jwt` (JwtStrategy).
   * @param context - contexto de execução do request atual
   * @returns `true` se a rota é pública ou se o JWT é válido; caso contrário lança/retorna conforme o comportamento padrão do `AuthGuard`
   */
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }
}
