import { Module } from '@nestjs/common';
import { ProjectItemsController } from './items.controller.js';
import { ItemDetailController } from './item-detail.controller.js';
import { RecentItemsController } from './recent-items.controller.js';
import { WorkItemsService } from './work-items.service.js';
import { RealtimeModule } from '../realtime/realtime.module.js';

@Module({
  imports: [RealtimeModule],
  controllers: [ProjectItemsController, ItemDetailController, RecentItemsController],
  providers: [WorkItemsService],
})
export class WorkItemsModule {}
