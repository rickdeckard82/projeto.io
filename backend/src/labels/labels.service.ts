import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';

/**
 * Regras de negócio de etiquetas (labels) de projeto, usadas para categorizar/filtrar itens de
 * trabalho. A validação de acesso ao projeto é feita pelo `ProjectMemberGuard` nos controllers.
 */
@Injectable()
export class LabelsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista as etiquetas de um projeto.
   * @param projectId - projeto ao qual as etiquetas pertencem
   * @returns etiquetas do projeto, em ordem alfabética por nome
   */
  async list(projectId: string) {
    return this.prisma.label.findMany({ where: { projectId }, orderBy: { name: 'asc' } });
  }

  /**
   * Cria uma nova etiqueta no projeto.
   * @param projectId - projeto ao qual a etiqueta pertencerá
   * @param dto - nome e cor da etiqueta
   * @returns a etiqueta criada
   */
  async create(projectId: string, dto: CreateLabelDto) {
    return this.prisma.label.create({ data: { projectId, name: dto.name, color: dto.color } });
  }

  /**
   * Atualiza nome e/ou cor de uma etiqueta existente.
   * @param labelId - id da etiqueta a atualizar
   * @param dto - campos a atualizar
   * @returns a etiqueta atualizada
   * @throws NotFoundException - se a etiqueta não existir
   */
  async update(labelId: string, dto: UpdateLabelDto) {
    const label = await this.prisma.label.findUnique({ where: { id: labelId } });
    if (!label) {
      throw new NotFoundException('Etiqueta não encontrada');
    }
    return this.prisma.label.update({ where: { id: labelId }, data: dto });
  }

  /**
   * Remove definitivamente uma etiqueta. Note que isso não remove os itens que a usam, apenas o
   * vínculo etiqueta-item deixa de existir (join table `ItemLabel`) por cascade do schema.
   * @param labelId - id da etiqueta a remover
   * @returns mensagem de confirmação
   * @throws NotFoundException - se a etiqueta não existir
   */
  async remove(labelId: string) {
    const label = await this.prisma.label.findUnique({ where: { id: labelId } });
    if (!label) {
      throw new NotFoundException('Etiqueta não encontrada');
    }
    await this.prisma.label.delete({ where: { id: labelId } });
    return { message: 'Etiqueta removida' };
  }
}
