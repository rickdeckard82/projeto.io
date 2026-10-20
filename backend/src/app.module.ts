import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { LabelsModule } from './labels/labels.module.js';
import { ModulesModule } from './modules/modules.module.js';
import { WorkItemsModule } from './work-items/work-items.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { MailModule } from './mail/mail.module.js';
import { NotesModule } from './notes/notes.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { MetricsModule } from './metrics/metrics.module.js';
import { AuditModule } from './audit/audit.module.js';
import { BackupModule } from './backup/backup.module.js';
import { HealthController } from './health/health.controller.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { TwoFactorEnforcedGuard } from './common/guards/two-factor-enforced.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Teto global de requisições por IP para toda a API (120/min). As rotas de autenticação
    // aplicam limites próprios, bem menores, via `@Throttle(...)` no `AuthController`.
    // Armazenamento em memória — se um dia o backend rodar em mais de uma réplica, trocar por
    // um storage compartilhado (ex.: `@nest-lab/throttler-storage-redis`).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    LabelsModule,
    ModulesModule,
    WorkItemsModule,
    DocumentsModule,
    SettingsModule,
    MailModule,
    NotesModule,
    NotificationsModule,
    MetricsModule,
    AuditModule,
    BackupModule,
  ],
  controllers: [HealthController],
  providers: [
    // Ordem importa: o rate limit roda antes da autenticação, para também proteger as rotas
    // públicas (login, cadastro, verificação de e-mail).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Depois do JwtAuthGuard (precisa de `req.user`): trava contas ADMIN sem 2FA ativo.
    { provide: APP_GUARD, useClass: TwoFactorEnforcedGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
