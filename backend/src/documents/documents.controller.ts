import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { GlobalRole } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { ProjectResource } from '../common/decorators/project-resource.decorator';
import { ProjectMemberGuard } from '../common/guards/project-member.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

/**
 * Endpoints de documentos aninhados sob um projeto (`/projects/:projectId/documents`): listagem
 * e criação. O parâmetro de rota já é o id do projeto, então `ProjectResource('project', ...)`
 * dispensa lookup no `ProjectMemberGuard`.
 */
@Controller('projects/:projectId/documents')
@UseGuards(ProjectMemberGuard)
@ProjectResource('project', 'projectId')
export class ProjectDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /** Lista os documentos do projeto. */
  @Get()
  list(@Param('projectId') projectId: string) {
    return this.documentsService.list(projectId);
  }

  /** Cria um novo documento no projeto; restrito a Admin/Membro. */
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

/**
 * Endpoints de um documento individual, endereçado só por `documentId` (`/documents/:documentId`).
 * Como a rota não traz o `projectId`, `ProjectResource('document', 'documentId')` instrui o
 * `ProjectMemberGuard` a resolver o projeto do documento via lookup antes de checar acesso.
 */
@Controller('documents/:documentId')
@UseGuards(ProjectMemberGuard)
@ProjectResource('document', 'documentId')
export class DocumentDetailController {
  constructor(private readonly documentsService: DocumentsService) {}

  /** Busca um documento pelo id. */
  @Get()
  findOne(@Param('documentId') documentId: string) {
    return this.documentsService.findOne(documentId);
  }

  /** Atualiza título e/ou conteúdo do documento; restrito a Admin/Membro. */
  @Roles(GlobalRole.ADMIN, GlobalRole.MEMBER)
  @Patch()
  update(
    @Param('documentId') documentId: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.update(documentId, dto, user);
  }

  /** Remove definitivamente o documento; restrito a Admin/Membro. */
  @Roles(GlobalRole.ADMIN, GlobalRole.MEMBER)
  @Delete()
  remove(@Param('documentId') documentId: string) {
    return this.documentsService.remove(documentId);
  }
}
