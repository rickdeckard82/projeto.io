import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { MembersController } from './members.controller';
import { StatusesController } from './statuses.controller';
import { ProjectsService } from './projects.service';

@Module({
  controllers: [ProjectsController, MembersController, StatusesController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
