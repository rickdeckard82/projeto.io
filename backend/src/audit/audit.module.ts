import { Global, Module } from '@nestjs/common';
import { AuditController } from './audit.controller.js';
import { AuditService } from './audit.service.js';

/**
 * `@Global()` para que qualquer módulo possa injetar `AuditService` sem precisar importar
 * `AuditModule` — a auditoria é transversal a auth, users e settings.
 */
@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
