import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { GlobalRole } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { UpdateStatusDto } from './dto/update-status.dto.js';
import { DEFAULT_STATUSES } from './default-statuses.js';
import { pickCoverColor, suggestProjectKey } from './project-key.util.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';

/**
 * Serviço de domínio para gestão de projetos: CRUD, arquivamento, membros e colunas do kanban (statuses).
 * Concentra as regras de negócio que os guards HTTP (`RolesGuard`, `ProjectMemberGuard`) não cobrem,
 * como filtragem de visibilidade em `list()` e geração/desambiguação da chave do projeto em `create()`.
 */
@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  /**
   * Lista projetos visíveis para o usuário atual, filtrando por arquivamento e por acesso.
   * Administradores enxergam todos os projetos; demais usuários só veem projetos dos quais
   * são membros (`project_members`) ou que estão marcados como públicos (`isPublic: true`).
   * @param user - Usuário autenticado que está solicitando a listagem.
   * @param archived - Quando `true`, retorna apenas projetos arquivados; quando `false`, apenas ativos.
   * @returns Lista de projetos conforme os filtros de arquivamento e visibilidade.
   */
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

  /**
   * Cria um novo projeto e o inicializa com as colunas padrão do kanban e os membros iniciais.
   * Efeitos colaterais: (1) resolve/gera a `key` do projeto via `resolveProjectKey` (imutável após
   * a criação); (2) escolhe uma cor de capa determinística a partir do nome quando não informada
   * (`pickCoverColor`); (3) adiciona automaticamente o dono (`ownerId`) e o criador como membros do
   * projeto; (4) semeia as 5 colunas padrão do kanban (`DEFAULT_STATUSES`).
   * @param dto - Dados de criação do projeto (nome, descrição, key/ícone/cor opcionais, dono opcional).
   * @param creator - Usuário autenticado que está criando o projeto (torna-se membro e dono padrão).
   * @returns Projeto criado.
   * @throws NotFoundException - quando `dto.ownerId` é informado mas não corresponde a um usuário existente.
   * @throws ConflictException - quando a `key` solicitada (via `resolveProjectKey`) já está em uso.
   */
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

  /**
   * Resolve a key final do projeto: valida unicidade quando o usuário informa uma key explícita,
   * ou deriva uma sugestão a partir do nome (`suggestProjectKey`) e a desambigua com sufixo
   * numérico incremental em caso de colisão (ex.: `PRJ`, `PRJ2`, `PRJ3`, ...).
   * @param requested - Key explicitamente informada pelo usuário, se houver.
   * @param name - Nome do projeto, usado para sugerir uma key quando `requested` não é informado.
   * @returns Key final, única, em maiúsculas.
   * @throws ConflictException - quando `requested` é informado e já existe um projeto com essa key.
   */
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

  /**
   * Busca um projeto pelo id. Não faz checagem de autorização — o acesso é garantido
   * antes, pelo `ProjectMemberGuard` na camada de controller.
   * @param id - Id do projeto.
   * @returns Projeto encontrado.
   * @throws NotFoundException - quando não existe projeto com o id informado.
   */
  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }
    return project;
  }

  /**
   * Atualiza os dados de um projeto (a `key` é imutável e não faz parte de `UpdateProjectDto`).
   * @param id - Id do projeto a atualizar.
   * @param dto - Campos a atualizar.
   * @returns Projeto atualizado.
   * @throws NotFoundException - quando não existe projeto com o id informado.
   */
  async update(id: string, dto: UpdateProjectDto) {
    await this.findOne(id);
    return this.prisma.project.update({ where: { id }, data: dto });
  }

  /**
   * Remove definitivamente um projeto e todos os dados dependentes (via cascade do schema).
   * @param id - Id do projeto a remover.
   * @returns Mensagem de confirmação.
   * @throws NotFoundException - quando não existe projeto com o id informado.
   */
  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.project.delete({ where: { id } });
    return { message: 'Projeto removido' };
  }

  /**
   * Arquiva um projeto (soft-archive via `archivedAt`), sem removê-lo do banco. Emite
   * `project:changed` (via {@link RealtimeGateway.emitProjectChanged}) para quem estiver com o
   * board aberto — a notificação é só UX; quem garante que ninguém escreve mais nos itens do
   * projeto é `WorkItemsService.assertProjectNotArchived`.
   * @param id - Id do projeto a arquivar.
   * @returns Projeto atualizado.
   * @throws NotFoundException - quando não existe projeto com o id informado.
   */
  async archive(id: string) {
    await this.findOne(id);
    const project = await this.prisma.project.update({ where: { id }, data: { archivedAt: new Date() } });
    this.realtimeGateway.emitProjectChanged(id);
    return project;
  }

  /**
   * Reverte o arquivamento de um projeto, limpando `archivedAt`. Também emite `project:changed`
   * (ver {@link archive}) para quem estiver com o board aberto.
   * @param id - Id do projeto a desarquivar.
   * @returns Projeto atualizado.
   * @throws NotFoundException - quando não existe projeto com o id informado.
   */
  async unarchive(id: string) {
    await this.findOne(id);
    const project = await this.prisma.project.update({ where: { id }, data: { archivedAt: null } });
    this.realtimeGateway.emitProjectChanged(id);
    return project;
  }

  /**
   * Lista os membros de um projeto, incluindo dados públicos do usuário associado.
   * @param id - Id do projeto.
   * @returns Lista de memberships do projeto, com o usuário incluído.
   */
  async listMembers(id: string) {
    return this.prisma.projectMember.findMany({
      where: { projectId: id },
      include: { user: { select: { id: true, email: true, fullName: true, avatarUrl: true, globalRole: true } } },
    });
  }

  /**
   * Adiciona um usuário como membro do projeto. Idempotente: se o usuário já for membro,
   * a operação não falha nem duplica a linha (via `upsert`).
   * @param id - Id do projeto.
   * @param userId - Id do usuário a adicionar como membro.
   * @returns Membership criada ou existente.
   * @throws NotFoundException - quando o usuário informado não existe.
   */
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

  /**
   * Remove um usuário dos membros do projeto. O proprietário (`project.ownerId`) nunca pode
   * ser removido — deve-se transferir a propriedade antes.
   * @param id - Id do projeto.
   * @param userId - Id do usuário a remover.
   * @returns Mensagem de confirmação.
   * @throws NotFoundException - quando não existe projeto com o id informado.
   * @throws BadRequestException - quando `userId` é o proprietário do projeto.
   */
  async removeMember(id: string, userId: string) {
    const project = await this.findOne(id);
    if (project.ownerId === userId) {
      throw new BadRequestException('Não é possível remover o proprietário do projeto');
    }
    await this.prisma.projectMember.deleteMany({ where: { projectId: id, userId } });
    return { message: 'Membro removido' };
  }

  /**
   * Lista as colunas (statuses) do kanban de um projeto, ordenadas pela posição de exibição.
   * @param id - Id do projeto.
   * @returns Lista de statuses ordenada por `position`.
   */
  async listStatuses(id: string) {
    return this.prisma.status.findMany({ where: { projectId: id }, orderBy: { position: 'asc' } });
  }

  /**
   * Atualiza uma coluna (status) do kanban, por exemplo para renomear ou reordenar.
   * @param statusId - Id do status a atualizar.
   * @param dto - Campos a atualizar.
   * @returns Status atualizado.
   * @throws NotFoundException - quando não existe status com o id informado.
   */
  async updateStatus(statusId: string, dto: UpdateStatusDto) {
    const status = await this.prisma.status.findUnique({ where: { id: statusId } });
    if (!status) {
      throw new NotFoundException('Status não encontrado');
    }
    return this.prisma.status.update({ where: { id: statusId }, data: dto });
  }
}
