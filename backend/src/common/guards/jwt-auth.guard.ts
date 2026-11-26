import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ApiKeysService, isApiKeyIpAllowed, readApiKey } from '../../api-keys/api-keys.service.js';
import { ALLOW_API_KEY } from '../decorators/allow-api-key.decorator.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

/**
 * Guard global (registrado via `APP_GUARD`) que exige um JWT de acesso válido
 * em toda rota, exceto as marcadas com `@Public()`. Antes de delegar para a
 * estratégia Passport (`JwtStrategy`), verifica os metadados `IS_PUBLIC_KEY`
 * no handler e na classe — se presentes, libera o acesso sem autenticar.
 * Chave de API (`Bearer pio_...`) só é aceita em rotas `@AllowApiKey()`.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly apiKeysService: ApiKeysService,
  ) {
    super();
  }

  /**
   * Decide se a rota exige autenticação. Rotas `@Public()` pulam a validação
   * do JWT; todas as demais são validadas pela estratégia `jwt` (JwtStrategy).
   * @param context - contexto de execução do request atual
   * @returns `true` se a rota é pública ou se o JWT é válido; caso contrário lança/retorna conforme o comportamento padrão do `AuthGuard`
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const apiKey = readApiKey(request.headers.authorization);
    if (apiKey) {
      if (!isApiKeyIpAllowed(request.ip)) {
        throw new ForbiddenException('Chave de API não aceita a partir deste endereço');
      }
      request.user = await this.apiKeysService.authenticate(apiKey);
      if (!this.reflector.get<boolean>(ALLOW_API_KEY, context.getHandler())) {
        throw new ForbiddenException('Esta rota não aceita chave de API');
      }
      return true;
    }
    return super.canActivate(context) as Promise<boolean>;
  }
}
