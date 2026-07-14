import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';

@Injectable()
export class LabelsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(projectId: string) {
    return this.prisma.label.findMany({ where: { projectId }, orderBy: { name: 'asc' } });
  }

  async create(projectId: string, dto: CreateLabelDto) {
    return this.prisma.label.create({ data: { projectId, name: dto.name, color: dto.color } });
  }

  async update(labelId: string, dto: UpdateLabelDto) {
    const label = await this.prisma.label.findUnique({ where: { id: labelId } });
    if (!label) {
      throw new NotFoundException('Etiqueta não encontrada');
    }
    return this.prisma.label.update({ where: { id: labelId }, data: dto });
  }

  async remove(labelId: string) {
    const label = await this.prisma.label.findUnique({ where: { id: labelId } });
    if (!label) {
      throw new NotFoundException('Etiqueta não encontrada');
    }
    await this.prisma.label.delete({ where: { id: labelId } });
    return { message: 'Etiqueta removida' };
  }
}
