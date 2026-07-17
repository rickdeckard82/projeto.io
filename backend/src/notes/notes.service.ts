import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { GlobalRole } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateNoteDto } from './dto/create-note.dto.js';
import { UpdateNoteDto } from './dto/update-note.dto.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

const CREATOR_SELECT = { select: { id: true, fullName: true, avatarUrl: true } };

/**
 * Notas de texto livre não vinculadas a projeto — um mural compartilhado visível a qualquer
 * usuário autenticado (usado na página inicial). Qualquer usuário autenticado pode criar; só
 * quem criou (ou um Admin) pode editar/apagar.
 */
@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista as notas, mais recentes primeiro.
   * @param limit - quantidade máxima de notas a retornar (ex.: preview da home); sem limite, retorna todas.
   * @returns notas com o autor (`createdBy`)
   */
  async list(limit?: number) {
    return this.prisma.note.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { createdBy: CREATOR_SELECT },
    });
  }

  /**
   * Cria uma nova nota. Qualquer usuário autenticado pode criar.
   * @param dto - conteúdo e cor (opcional) da nota
   * @param creator - usuário autenticado que está criando
   * @returns a nota criada, com o autor (`createdBy`)
   */
  async create(dto: CreateNoteDto, creator: AuthenticatedUser) {
    return this.prisma.note.create({
      data: { content: dto.content, color: dto.color, createdById: creator.id },
      include: { createdBy: CREATOR_SELECT },
    });
  }

  /**
   * Atualiza uma nota existente.
   * @param id - id da nota
   * @param dto - campos a atualizar (conteúdo e/ou cor)
   * @param actor - usuário autenticado que está editando
   * @returns a nota atualizada, com o autor (`createdBy`)
   * @throws NotFoundException - se a nota não existir
   * @throws ForbiddenException - se quem está editando não for o autor nem um Admin
   */
  async update(id: string, dto: UpdateNoteDto, actor: AuthenticatedUser) {
    const note = await this.findOne(id);
    this.assertCanModify(note.createdById, actor);

    return this.prisma.note.update({
      where: { id },
      data: dto,
      include: { createdBy: CREATOR_SELECT },
    });
  }

  /**
   * Remove definitivamente uma nota.
   * @param id - id da nota
   * @param actor - usuário autenticado que está removendo
   * @returns mensagem de confirmação
   * @throws NotFoundException - se a nota não existir
   * @throws ForbiddenException - se quem está removendo não for o autor nem um Admin
   */
  async remove(id: string, actor: AuthenticatedUser) {
    const note = await this.findOne(id);
    this.assertCanModify(note.createdById, actor);

    await this.prisma.note.delete({ where: { id } });
    return { message: 'Nota removida' };
  }

  /** Busca uma nota pelo id. @throws NotFoundException - se não existir nota com esse id */
  private async findOne(id: string) {
    const note = await this.prisma.note.findUnique({ where: { id } });
    if (!note) {
      throw new NotFoundException('Nota não encontrada');
    }
    return note;
  }

  /** Só o autor da nota ou um Admin pode editá-la/removê-la. */
  private assertCanModify(createdById: string, actor: AuthenticatedUser) {
    if (createdById !== actor.id && actor.globalRole !== GlobalRole.ADMIN) {
      throw new ForbiddenException('Você só pode editar ou remover notas que você criou');
    }
  }
}
