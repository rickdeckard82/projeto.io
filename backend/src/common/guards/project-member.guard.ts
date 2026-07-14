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
