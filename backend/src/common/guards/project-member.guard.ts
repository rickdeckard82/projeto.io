import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GlobalRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PROJECT_RESOURCE_KEY,
  ProjectResourceMeta,
} from '../decorators/project-resource.decorator';

/**
 * Enforces project-scoped access: Admins bypass membership entirely.
 * Members/Viewers must have a `project_members` row for the resolved project,
 * unless the project is public — in which case any authenticated user may
 * read it (GET only; mutations still require membership + @Roles()).
 * Write-vs-read restriction for Viewer is handled by @Roles() on mutation
 * routes (Viewer is simply not in the allowed roles list there) — this
 * guard only enforces "are you part of this project at all".
 */
@Injectable()
export class ProjectMemberGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Algoritmo completo de autorização por projeto:
   * 1. Lê os metadados `@ProjectResource(kind, param)` (default: `{ kind: 'project', param: 'projectId' }`
   *    quando o controller não os declara).
   * 2. Sem `request.user`, nega o acesso (não deveria ocorrer pois `JwtAuthGuard` roda antes).
   * 3. Admin global (`GlobalRole.ADMIN`) sempre passa, sem nem resolver o projeto.
   * 4. Resolve o id do projeto a partir do parâmetro de rota: direto se `kind: 'project'`,
   *    ou via lookup (`resolveProjectId`) se o parâmetro referencia um work item, documento ou label.
   * 5. Busca a membership (`project_members`) do usuário nesse projeto.
   * 6. Sem membership: se o método é `GET` e o projeto é público (`isPublic: true`), libera a
   *    leitura mesmo assim; qualquer outro método, ou projeto não público, é bloqueado com 403.
   * Em caso de sucesso, grava `request.resolvedProjectId` para reuso por handlers/services
   * downstream, evitando resolver o projeto de novo.
   * @param context - contexto de execução do request atual
   * @returns `true` quando o acesso é permitido
   * @throws NotFoundException - parâmetro de rota ausente ou recurso referenciado não encontrado
   * @throws ForbiddenException - usuário autenticado mas sem membership no projeto (e projeto não público, ou método diferente de GET)
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<ProjectResourceMeta>(PROJECT_RESOURCE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? { kind: 'project', param: 'projectId' };

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      return false;
    }
    if (user.globalRole === GlobalRole.ADMIN) {
      return true;
    }

    const resourceId = request.params[meta.param];
    if (!resourceId) {
      throw new NotFoundException('Recurso não informado');
    }

    const projectId = await this.resolveProjectId(meta.kind, resourceId);
    if (!projectId) {
      throw new NotFoundException('Recurso não encontrado');
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: user.id } },
    });

    if (!membership) {
      if (request.method === 'GET') {
        const project = await this.prisma.project.findUnique({
          where: { id: projectId },
          select: { isPublic: true },
        });
        if (project?.isPublic) {
          request.resolvedProjectId = projectId;
          return true;
        }
      }
      throw new ForbiddenException('Você não é membro deste projeto');
    }

    request.resolvedProjectId = projectId;
    return true;
  }

  /**
   * Traduz o id de um recurso de rota para o id do projeto ao qual ele
   * pertence. Para `kind: 'project'` o próprio id já é o projeto; para os
   * demais tipos (`workItem`, `document`, `label`) faz um lookup pontual
   * (`select: { projectId: true }`) na respectiva tabela.
   * @param kind - tipo do recurso referenciado pelo parâmetro de rota
   * @param resourceId - id do recurso (projeto, work item, documento ou label)
   * @returns id do projeto correspondente, ou `null` se o recurso não existir
   */
  private async resolveProjectId(
    kind: ProjectResourceMeta['kind'],
    resourceId: string,
  ): Promise<string | null> {
    switch (kind) {
      case 'project':
        return resourceId;
      case 'workItem': {
        const item = await this.prisma.workItem.findUnique({
          where: { id: resourceId },
          select: { projectId: true },
        });
        return item?.projectId ?? null;
      }
      case 'document': {
        const doc = await this.prisma.document.findUnique({
          where: { id: resourceId },
          select: { projectId: true },
        });
        return doc?.projectId ?? null;
      }
      case 'label': {
        const label = await this.prisma.label.findUnique({
          where: { id: resourceId },
          select: { projectId: true },
        });
        return label?.projectId ?? null;
      }
      default:
        return null;
    }
  }
}
