import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GlobalRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { QueryItemsDto } from './dto/query-items.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

const ITEM_INCLUDE = {
  assignees: { include: { user: { select: { id: true, email: true, fullName: true, avatarUrl: true } } } },
  labels: { include: { label: true } },
  status: true,
  subItems: true,
};

const RECENT_ITEM_INCLUDE = {
  ...ITEM_INCLUDE,
  project: { select: { id: true, name: true } },
};

@Injectable()
export class WorkItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(projectId: string, query: QueryItemsDto) {
    const where: any = { projectId };
    if (query.statusId) where.statusId = query.statusId;
    if (query.assigneeId) where.assignees = { some: { userId: query.assigneeId } };
    if (query.labelId) where.labels = { some: { labelId: query.labelId } };
    if (query.parentId === 'null') where.parentId = null;
    else if (query.parentId) where.parentId = query.parentId;

    return this.prisma.workItem.findMany({
      where,
      include: ITEM_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(projectId: string, dto: CreateItemDto, creator: AuthenticatedUser) {
    let statusId = dto.statusId;
    if (!statusId) {
      const firstStatus = await this.prisma.status.findFirst({
        where: { projectId },
        orderBy: { position: 'asc' },
      });
      if (!firstStatus) {
        throw new BadRequestException('Projeto sem status configurado');
      }
      statusId = firstStatus.id;
    } else {
      await this.assertStatusBelongsToProject(statusId, projectId);
    }

    if (dto.parentId) {
      await this.assertItemBelongsToProject(dto.parentId, projectId);
    }

    return this.prisma.workItem.create({
      data: {
        projectId,
        title: dto.title,
        description: dto.description,
        statusId,
        priority: dto.priority,
        parentId: dto.parentId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        createdById: creator.id,
      },
      include: ITEM_INCLUDE,
    });
  }

  async listRecentForUser(user: AuthenticatedUser, limit: number) {
    const where =
      user.globalRole === GlobalRole.ADMIN ? {} : { project: { members: { some: { userId: user.id } } } };

    return this.prisma.workItem.findMany({
      where,
      include: RECENT_ITEM_INCLUDE,
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.workItem.findUnique({ where: { id }, include: ITEM_INCLUDE });
    if (!item) {
      throw new NotFoundException('Item não encontrado');
    }
    return item;
  }

  async update(id: string, dto: UpdateItemDto) {
    const item = await this.findOne(id);

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('Um item não pode ser pai de si mesmo');
      }
      await this.assertItemBelongsToProject(dto.parentId, item.projectId);
    }

    return this.prisma.workItem.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        parentId: dto.parentId === undefined ? undefined : dto.parentId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      include: ITEM_INCLUDE,
    });
  }

  async updateStatus(id: string, statusId: string) {
    const item = await this.findOne(id);
    await this.assertStatusBelongsToProject(statusId, item.projectId);
    return this.prisma.workItem.update({ where: { id }, data: { statusId }, include: ITEM_INCLUDE });
  }

  async updateAssignees(id: string, userIds: string[]) {
    await this.findOne(id);
    await this.prisma.$transaction([
      this.prisma.itemAssignee.deleteMany({ where: { workItemId: id } }),
      this.prisma.itemAssignee.createMany({
        data: userIds.map((userId) => ({ workItemId: id, userId })),
        skipDuplicates: true,
      }),
    ]);
    return this.findOne(id);
  }

  async updateLabels(id: string, labelIds: string[]) {
    const item = await this.findOne(id);
    for (const labelId of labelIds) {
      await this.assertLabelBelongsToProject(labelId, item.projectId);
    }
    await this.prisma.$transaction([
      this.prisma.itemLabel.deleteMany({ where: { workItemId: id } }),
      this.prisma.itemLabel.createMany({
        data: labelIds.map((labelId) => ({ workItemId: id, labelId })),
        skipDuplicates: true,
      }),
    ]);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.workItem.delete({ where: { id } });
    return { message: 'Item removido' };
  }

  private async assertStatusBelongsToProject(statusId: string, projectId: string) {
    const status = await this.prisma.status.findUnique({ where: { id: statusId } });
    if (!status || status.projectId !== projectId) {
      throw new BadRequestException('Status inválido para este projeto');
    }
  }

  private async assertItemBelongsToProject(itemId: string, projectId: string) {
    const item = await this.prisma.workItem.findUnique({ where: { id: itemId } });
    if (!item || item.projectId !== projectId) {
      throw new BadRequestException('Item pai inválido para este projeto');
    }
  }

  private async assertLabelBelongsToProject(labelId: string, projectId: string) {
    const label = await this.prisma.label.findUnique({ where: { id: labelId } });
    if (!label || label.projectId !== projectId) {
      throw new BadRequestException('Etiqueta inválida para este projeto');
    }
  }
}
