import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

/**
 * Regras de negócio de documentos (páginas de conteúdo markdown puro por projeto). O conteúdo em
 * si não recebe nenhum processamento/parse aqui — o texto markdown é armazenado e devolvido como
 * está, cabendo ao frontend renderizá-lo. A validação de acesso ao projeto é feita pelo
 * `ProjectMemberGuard` nos controllers.
 */
@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista os documentos de um projeto.
   * @param projectId - projeto ao qual os documentos pertencem
   * @returns documentos do projeto, ordenados por última atualização (mais recentes primeiro)
   */
  async list(projectId: string) {
    return this.prisma.document.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Cria um novo documento no projeto. O conteúdo é opcional e, se ausente, o documento é criado
   * com corpo vazio (string vazia), permitindo criar a página primeiro e escrever depois.
   * @param projectId - projeto ao qual o documento pertencerá
   * @param dto - título e conteúdo markdown (opcional) do documento
   * @param creator - usuário autenticado que está criando o documento (vira `createdById`)
   * @returns o documento criado
   */
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

  /**
   * Busca um documento pelo id.
   * @param id - id do documento
   * @returns o documento encontrado
   * @throws NotFoundException - se não existir documento com esse id
   */
  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) {
      throw new NotFoundException('Documento não encontrado');
    }
    return doc;
  }

  /**
   * Atualiza título e/ou conteúdo de um documento, registrando quem foi o último editor.
   * @param id - id do documento a atualizar
   * @param dto - campos a atualizar (título e/ou conteúdo)
   * @param editor - usuário autenticado que está editando (vira `updatedById`)
   * @returns o documento atualizado
   * @throws NotFoundException - se o documento não existir
   */
  async update(id: string, dto: UpdateDocumentDto, editor: AuthenticatedUser) {
    await this.findOne(id);
    return this.prisma.document.update({
      where: { id },
      data: { ...dto, updatedById: editor.id },
    });
  }

  /**
   * Remove definitivamente um documento.
   * @param id - id do documento a remover
   * @returns mensagem de confirmação
   * @throws NotFoundException - se o documento não existir
   */
  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.document.delete({ where: { id } });
    return { message: 'Documento removido' };
  }
}
