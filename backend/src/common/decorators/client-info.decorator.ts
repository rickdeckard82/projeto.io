import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuditClientInfo } from '../../audit/audit.service.js';

/**
 * Injeta `{ ip, userAgent }` da requisição atual, para alimentar a trilha de auditoria.
 * `req.ip` respeita o `trust proxy` configurado no `main.ts` — atrás do Nginx Proxy Manager,
 * é o IP real do cliente (do `X-Forwarded-For`), não o do proxy.
 */
export const ClientInfo = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuditClientInfo => {
    const request = ctx.switchToHttp().getRequest();
    return {
      ip: request.ip ?? null,
      userAgent: typeof request.get === 'function' ? request.get('user-agent') ?? null : null,
    };
  },
);
