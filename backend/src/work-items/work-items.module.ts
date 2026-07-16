import { Module } from '@nestjs/common';
import { ProjectItemsController } from './items.controller';
import { ItemDetailController } from './item-detail.controller';
import { RecentItemsController } from './recent-items.controller';
import { WorkItemsService } from './work-items.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [ProjectItemsController, ItemDetailController, RecentItemsController],
  providers: [WorkItemsService],
})
export class WorkItemsModule {}
