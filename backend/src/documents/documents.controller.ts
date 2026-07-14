import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { GlobalRole } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ProjectResource } from '../common/decorators/project-resource.decorator';
import { ProjectMemberGuard } from '../common/guards/project-member.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('projects/:projectId/documents')
@UseGuards(ProjectMemberGuard)
@ProjectResource('project', 'projectId')
export class ProjectDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  list(@Param('projectId') projectId: string) {
    return this.documentsService.list(projectId);
  }

  @Roles(GlobalRole.ADMIN, GlobalRole.MEMBER)
  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.create(projectId, dto, user);
  }
}

@Controller('documents/:documentId')
@UseGuards(ProjectMemberGuard)
@ProjectResource('document', 'documentId')
export class DocumentDetailController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  findOne(@Param('documentId') documentId: string) {
    return this.documentsService.findOne(documentId);
  }

  @Roles(GlobalRole.ADMIN, GlobalRole.MEMBER)
  @Patch()
  update(
    @Param('documentId') documentId: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.update(documentId, dto, user);
  }

  @Roles(GlobalRole.ADMIN, GlobalRole.MEMBER)
  @Delete()
  remove(@Param('documentId') documentId: string) {
    return this.documentsService.remove(documentId);
  }
}
