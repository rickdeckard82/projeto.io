import { Module } from '@nestjs/common';
import { ProjectModulesController, ModuleDetailController } from './modules.controller.js';
import { ModulesService } from './modules.service.js';

@Module({
  controllers: [ProjectModulesController, ModuleDetailController],
  providers: [ModulesService],
})
export class ModulesModule {}
