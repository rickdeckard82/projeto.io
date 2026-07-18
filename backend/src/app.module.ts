import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { LabelsModule } from './labels/labels.module.js';
import { WorkItemsModule } from './work-items/work-items.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { MailModule } from './mail/mail.module.js';
import { NotesModule } from './notes/notes.module.js';
import { MetricsModule } from './metrics/metrics.module.js';
import { HealthController } from './health/health.controller.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    LabelsModule,
    WorkItemsModule,
    DocumentsModule,
    SettingsModule,
    MailModule,
    NotesModule,
    MetricsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
