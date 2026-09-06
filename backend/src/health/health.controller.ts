import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator.js';

/** Endpoint de health check, sem autenticação, consumido por `docker-entrypoint.sh` e monitoramento de uptime. */
@SkipThrottle()
@Controller('health')
export class HealthController {
  /** Retorna um status fixo indicando que o processo da API está de pé e respondendo. */
  @Public()
  @Get()
  check() {
    return { status: 'ok' };
  }
}
