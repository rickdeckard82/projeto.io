import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateLabelDto } from './dto/create-label.dto.js';
import { UpdateLabelDto } from './dto/update-label.dto.js';

/**
 * Regras de negócio das etiquetas (labels), usadas para categorizar/filtrar itens de trabalho.
 * São globais: a mesma lista vale para todos os projetos (gerida em `/labels` no frontend).
 */
@Injectable()
export class LabelsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista todas as etiquetas, com quantos itens usam cada uma.
   * @returns etiquetas em ordem alfabética por nome, com `itemCount`
   */
  async list() {
    const labels = await this.prisma.label.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { items: true } } },
    });
    return labels.map(({ _count, ...label }) => ({ ...label, itemCount: _count.items }));
  }

  /**
   * Cria uma nova etiqueta global.
   * @param dto - nome e cor da etiqueta
   * @returns a etiqueta criada
   * @throws ConflictException - se já existir etiqueta com o mesmo nome (sem diferenciar maiúsculas)
   */
  async create(dto: CreateLabelDto) {
    const name = dto.name.trim();
    await this.assertNameAvailable(name);
    return this.prisma.label.create({ data: { name, color: dto.color } });
  }

  /**
   * Atualiza nome e/ou cor de uma etiqueta existente — vale para todos os projetos que a usam.
   * @param labelId - id da etiqueta a atualizar
   * @param dto - campos a atualizar
   * @returns a etiqueta atualizada
   * @throws NotFoundException - se a etiqueta não existir
   * @throws ConflictException - se o novo nome já for de outra etiqueta
   */
  async update(labelId: string, dto: UpdateLabelDto) {
    await this.findOrFail(labelId);
    const name = dto.name?.trim();
    if (name) await this.assertNameAvailable(name, labelId);
    return this.prisma.label.update({ where: { id: labelId }, data: { name: name || undefined, color: dto.color } });
  }

  /**
   * Remove definitivamente uma etiqueta. Os itens que a usam continuam existindo; só o vínculo
   * etiqueta-item (`ItemLabel`) some, por cascade do schema — em todos os projetos.
   * @param labelId - id da etiqueta a remover
   * @returns mensagem de confirmação
   * @throws NotFoundException - se a etiqueta não existir
   */
  async remove(labelId: string) {
    await this.findOrFail(labelId);
    await this.prisma.label.delete({ where: { id: labelId } });
    return { message: 'Etiqueta removida' };
  }

  private async findOrFail(labelId: string) {
    const label = await this.prisma.label.findUnique({ where: { id: labelId } });
    if (!label) {
      throw new NotFoundException('Etiqueta não encontrada');
    }
    return label;
  }

  private async assertNameAvailable(name: string, exceptId?: string) {
    const existing = await this.prisma.label.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    });
    if (existing) {
      throw new ConflictException(`Já existe a etiqueta "${existing.name}"`);
    }
  }
}
