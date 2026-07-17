import { Module } from '@nestjs/common';
import { ProjectLabelsController, LabelsController } from './labels.controller.js';
import { LabelsService } from './labels.service.js';

@Module({
  controllers: [ProjectLabelsController, LabelsController],
  providers: [LabelsService],
})
export class LabelsModule {}
