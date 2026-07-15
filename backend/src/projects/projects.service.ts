import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { GlobalRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { DEFAULT_STATUSES } from './default-statuses';
import { pickCoverColor, suggestProjectKey } from './project-key.util';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser, archived: boolean) {
    const archivedFilter = archived ? { not: null } : null;

    if (user.globalRole === GlobalRole.ADMIN) {
      return this.prisma.project.findMany({
        where: { archivedAt: archivedFilter },
        orderBy: { createdAt: 'desc' },
      });
    }
    return this.prisma.project.findMany({
      where: {
        archivedAt: archivedFilter,
        OR: [{ members: { some: { userId: user.id } } }, { isPublic: true }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateProjectDto, creator: AuthenticatedUser) {
    const key = await this.resolveProjectKey(dto.key, dto.name);

    let ownerId = creator.id;
    if (dto.ownerId && dto.ownerId !== creator.id) {
      const leadExists = await this.prisma.user.findUnique({ where: { id: dto.ownerId } });
      if (!leadExists) {
        throw new NotFoundException('Usuário líder não encontrado');
      }
      ownerId = dto.ownerId;
    }

    return this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        key,
        icon: dto.icon,
        coverColor: dto.coverColor || pickCoverColor(dto.name),
        isPublic: dto.isPublic ?? false,
        ownerId,
        members: {
          createMany: {
            data: [...new Set([ownerId, creator.id])].map((userId) => ({ userId })),
          },
        },
        statuses: { createMany: { data: DEFAULT_STATUSES } },
      },
    });
  }

  private async resolveProjectKey(requested: string | undefined, name: string): Promise<string> {
    if (requested) {
      const upper = requested.toUpperCase();
      const existing = await this.prisma.project.findUnique({ where: { key: upper } });
      if (existing) {
        throw new ConflictException('Este ID de projeto já está em uso');
      }
      return upper;
    }

    const base = suggestProjectKey(name);
    let candidate = base;
    let suffix = 1;
    while (await this.prisma.project.findUnique({ where: { key: candidate } })) {
      suffix += 1;
      candidate = `${base}${suffix}`;
    }
    return candidate;
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }
    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.findOne(id);
    return this.prisma.project.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.project.delete({ where: { id } });
    return { message: 'Projeto removido' };
  }

  async archive(id: string) {
    await this.findOne(id);
    return this.prisma.project.update({ where: { id }, data: { archivedAt: new Date() } });
  }

  async unarchive(id: string) {
    await this.findOne(id);
    return this.prisma.project.update({ where: { id }, data: { archivedAt: null } });
  }

  async listMembers(id: string) {
    return this.prisma.projectMember.findMany({
      where: { projectId: id },
      include: { user: { select: { id: true, email: true, fullName: true, avatarUrl: true, globalRole: true } } },
    });
  }

  async addMember(id: string, userId: string) {
    const userExists = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return this.prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: id, userId } },
      create: { projectId: id, userId },
      update: {},
    });
  }

  async removeMember(id: string, userId: string) {
    const project = await this.findOne(id);
    if (project.ownerId === userId) {
      throw new BadRequestException('Não é possível remover o proprietário do projeto');
    }
    await this.prisma.projectMember.deleteMany({ where: { projectId: id, userId } });
    return { message: 'Membro removido' };
  }

  async listStatuses(id: string) {
    return this.prisma.status.findMany({ where: { projectId: id }, orderBy: { position: 'asc' } });
  }

  async updateStatus(statusId: string, dto: UpdateStatusDto) {
    const status = await this.prisma.status.findUnique({ where: { id: statusId } });
    if (!status) {
      throw new NotFoundException('Status não encontrado');
    }
    return this.prisma.status.update({ where: { id: statusId }, data: dto });
  }
}
