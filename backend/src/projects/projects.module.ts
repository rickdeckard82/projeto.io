import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller.js';
import { MembersController } from './members.controller.js';
import { StatusesController } from './statuses.controller.js';
import { ProjectsService } from './projects.service.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [RealtimeModule, NotificationsModule],
  controllers: [ProjectsController, MembersController, StatusesController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
