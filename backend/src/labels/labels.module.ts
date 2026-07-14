import { Module } from '@nestjs/common';
import { ProjectLabelsController, LabelsController } from './labels.controller';
import { LabelsService } from './labels.service';

@Module({
  controllers: [ProjectLabelsController, LabelsController],
  providers: [LabelsService],
})
export class LabelsModule {}
