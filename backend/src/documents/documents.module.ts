import { Module } from '@nestjs/common';
import { ProjectDocumentsController, DocumentDetailController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  controllers: [ProjectDocumentsController, DocumentDetailController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
