import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller.js';
import { MembersController } from './members.controller.js';
import { StatusesController } from './statuses.controller.js';
import { ProjectsService } from './projects.service.js';

@Module({
  controllers: [ProjectsController, MembersController, StatusesController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
