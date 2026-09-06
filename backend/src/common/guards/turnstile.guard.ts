import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TOKEN_HEADER = 'x-turnstile-token';

/**
 * Valida o token do Cloudflare Turnstile enviado pelo frontend no header `X-Turnstile-Token`,
 * chamando o `siteverify` do Cloudflare. Aplicado com `@UseGuards(TurnstileGuard)` nas rotas
 * públicas sensíveis (`login`, `register`).
 *
 * Fica **inerte** quando `TURNSTILE_SECRET_KEY` não está configurada (desenvolvimento sem as
 * chaves) — o guard simplesmente libera. Falha de infraestrutura ao chamar o `siteverify`
 * (rede/5xx) é *fail-open* (loga e libera): não vale derrubar todos os logins do app se o
 * endpoint do Cloudflare estiver fora. Só um `success: false` explícito bloqueia.
 */
@Injectable()
export class TurnstileGuard implements CanActivate {
  private readonly logger = new Logger(TurnstileGuard.name);
  private readonly secret = process.env.TURNSTILE_SECRET_KEY;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.secret) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const token = req.headers?.[TOKEN_HEADER];
    if (!token || typeof token !== 'string') {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'TURNSTILE_REQUIRED',
        message: 'Verificação anti-robô ausente. Recarregue a página e tente de novo.',
      });
    }

    const body = new URLSearchParams({ secret: this.secret, response: token });
    if (req.ip) {
      body.set('remoteip', req.ip);
    }

    let data: { success?: boolean; ['error-codes']?: string[] };
    try {
      const res = await fetch(SITEVERIFY_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
      });
      data = (await res.json()) as typeof data;
    } catch (err) {
      this.logger.error('Falha ao contatar o siteverify do Turnstile — liberando (fail-open)', err instanceof Error ? err.stack : String(err));
      return true;
    }

    if (data.success === true) {
      return true;
    }

    this.logger.warn(`Turnstile recusado: ${JSON.stringify(data['error-codes'] ?? [])}`);
    throw new ForbiddenException({
      statusCode: 403,
      code: 'TURNSTILE_FAILED',
      message: 'Verificação anti-robô inválida. Recarregue a página e tente de novo.',
    });
  }
}
