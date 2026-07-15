import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';

/** Endpoint de health check, sem autenticação, consumido por `docker-entrypoint.sh` e monitoramento de uptime. */
@Controller('health')
export class HealthController {
  /** Retorna um status fixo indicando que o processo da API está de pé e respondendo. */
  @Public()
  @Get()
  check() {
    return { status: 'ok' };
  }
}
