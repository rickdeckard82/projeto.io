import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(projectId: string) {
    return this.prisma.document.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(projectId: string, dto: CreateDocumentDto, creator: AuthenticatedUser) {
    return this.prisma.document.create({
      data: {
        projectId,
        title: dto.title,
        content: dto.content ?? '',
        createdById: creator.id,
      },
    });
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) {
      throw new NotFoundException('Documento não encontrado');
    }
    return doc;
  }

  async update(id: string, dto: UpdateDocumentDto, editor: AuthenticatedUser) {
    await this.findOne(id);
    return this.prisma.document.update({
      where: { id },
      data: { ...dto, updatedById: editor.id },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.document.delete({ where: { id } });
    return { message: 'Documento removido' };
  }
}
