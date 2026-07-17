import { Module } from '@nestjs/common';
import { ProjectDocumentsController, DocumentDetailController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';

@Module({
  controllers: [ProjectDocumentsController, DocumentDetailController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
