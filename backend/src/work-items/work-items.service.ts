import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GlobalRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { QueryItemsDto } from './dto/query-items.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

/**
 * Include padrão usado ao carregar um work item: traz os responsáveis (com dados básicos do
 * usuário), as etiquetas, o status atual e os sub-itens diretos, para que a UI monte o cartão/
 * detalhe do item em uma única consulta, sem N+1.
 */
const ITEM_INCLUDE = {
  assignees: { include: { user: { select: { id: true, email: true, fullName: true, avatarUrl: true } } } },
  labels: { include: { label: true } },
  status: true,
  subItems: true,
};

/**
 * Igual a {@link ITEM_INCLUDE}, mas também traz `id`/`name` do projeto do item — necessário na
 * listagem de "itens recentes" porque ela agrega itens de vários projetos e a UI precisa exibir
 * a qual projeto cada item pertence.
 */
const RECENT_ITEM_INCLUDE = {
  ...ITEM_INCLUDE,
  project: { select: { id: true, name: true } },
};

/**
 * Regras de negócio de itens de trabalho (work items): CRUD, atribuição de responsáveis,
 * etiquetas, mudança de status e listagem para o kanban/lista. A validação de acesso ao projeto
 * (membro vs. público) é responsabilidade do `ProjectMemberGuard` nos controllers; este serviço
 * assume que o chamador já foi autorizado a agir sobre o `projectId`/`id` recebido.
 */
@Injectable()
export class WorkItemsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista os itens de um projeto, aplicando os filtros opcionais vindos da querystring.
   * `parentId` tem tratamento especial: o valor literal `'null'` (string) filtra itens de topo
   * (sem pai), enquanto um id filtra os sub-itens daquele pai; omitir o parâmetro não filtra por
   * hierarquia.
   * @param projectId - projeto ao qual os itens pertencem
   * @param query - filtros opcionais (`statusId`, `assigneeId`, `labelId`, `parentId`)
   * @returns itens do projeto que casam com os filtros, ordenados por data de criação (mais antigos primeiro)
   */
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

  /**
   * Cria um novo item de trabalho dentro do projeto. Se nenhum `statusId` for informado, usa o
   * primeiro status do kanban (menor `position`) como padrão — todo projeto tem ao menos os 5
   * status seedados por `default-statuses.ts`, então isso nunca deveria ficar sem opção. Se
   * `parentId` for informado, valida que o item pai pertence ao mesmo projeto antes de criar o
   * sub-item.
   * @param projectId - projeto ao qual o item pertencerá
   * @param dto - dados do item a criar
   * @param creator - usuário autenticado que está criando o item (vira `createdById`)
   * @returns o item criado, com relações carregadas via {@link ITEM_INCLUDE}
   * @throws BadRequestException - se o projeto não tiver nenhum status configurado, se o `statusId` informado não pertencer ao projeto, ou se o `parentId` informado não pertencer ao projeto
   */
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

  /**
   * Lista os itens de trabalho mais recentemente atualizados que o usuário pode ver, para
   * alimentar a lista "itens recentes" da home. Administradores enxergam itens de todos os
   * projetos; demais usuários só veem itens de projetos dos quais são membros (`project.members`).
   * Note que isso não replica a regra de "projeto público" do `ProjectMemberGuard" — aqui a
   * visibilidade é sempre por membership explícita, mesmo para projetos públicos.
   * @param user - usuário autenticado que está consultando
   * @param limit - quantidade máxima de itens a retornar
   * @returns itens visíveis ao usuário, ordenados por `updatedAt` decrescente (mais recentes primeiro)
   */
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

  /**
   * Busca um item de trabalho pelo id, já com suas relações carregadas.
   * @param id - id do item
   * @returns o item encontrado
   * @throws NotFoundException - se não existir item com esse id
   */
  async findOne(id: string) {
    const item = await this.prisma.workItem.findUnique({ where: { id }, include: ITEM_INCLUDE });
    if (!item) {
      throw new NotFoundException('Item não encontrado');
    }
    return item;
  }

  /**
   * Atualiza os campos editáveis de um item (título, descrição, prioridade, datas e pai). Impede
   * que um item se torne pai de si mesmo e, ao trocar de pai, garante que o novo pai pertence ao
   * mesmo projeto do item — a hierarquia de sub-itens nunca cruza projetos.
   * @param id - id do item a atualizar
   * @param dto - campos a atualizar (campos ausentes/`undefined` preservam o valor atual)
   * @returns o item atualizado, com relações carregadas via {@link ITEM_INCLUDE}
   * @throws NotFoundException - se o item não existir
   * @throws BadRequestException - se `dto.parentId` for o próprio item, ou se o novo pai não pertencer ao mesmo projeto
   */
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

  /**
   * Move o item para outra coluna do kanban (troca de status). É o método acionado pelo
   * drag-and-drop do board no frontend.
   * @param id - id do item
   * @param statusId - id do novo status
   * @returns o item atualizado
   * @throws NotFoundException - se o item não existir
   * @throws BadRequestException - se o status informado não pertencer ao mesmo projeto do item
   */
  async updateStatus(id: string, statusId: string) {
    const item = await this.findOne(id);
    await this.assertStatusBelongsToProject(statusId, item.projectId);
    return this.prisma.workItem.update({ where: { id }, data: { statusId }, include: ITEM_INCLUDE });
  }

  /**
   * Substitui integralmente a lista de responsáveis do item pela lista informada (remove todos os
   * vínculos atuais e recria os novos dentro de uma transação, para evitar estado parcial).
   * @param id - id do item
   * @param userIds - ids dos usuários que passarão a ser os únicos responsáveis pelo item
   * @returns o item atualizado, com a nova lista de responsáveis
   * @throws NotFoundException - se o item não existir
   */
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

  /**
   * Substitui integralmente a lista de etiquetas do item pela lista informada (mesma estratégia
   * de "apagar tudo e recriar" de {@link updateAssignees}, dentro de uma transação). Cada etiqueta
   * é validada individualmente contra o projeto do item antes da troca.
   * @param id - id do item
   * @param labelIds - ids das etiquetas que passarão a ser as únicas associadas ao item
   * @returns o item atualizado, com a nova lista de etiquetas
   * @throws NotFoundException - se o item não existir
   * @throws BadRequestException - se alguma etiqueta informada não pertencer ao projeto do item
   */
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

  /**
   * Remove definitivamente um item de trabalho.
   * @param id - id do item a remover
   * @returns mensagem de confirmação
   * @throws NotFoundException - se o item não existir
   */
  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.workItem.delete({ where: { id } });
    return { message: 'Item removido' };
  }

  /** Garante que o status informado existe e pertence ao projeto esperado, evitando que um item receba um status de outro projeto. */
  private async assertStatusBelongsToProject(statusId: string, projectId: string) {
    const status = await this.prisma.status.findUnique({ where: { id: statusId } });
    if (!status || status.projectId !== projectId) {
      throw new BadRequestException('Status inválido para este projeto');
    }
  }

  /** Garante que o item (usado como pai) existe e pertence ao projeto esperado, evitando hierarquias de sub-itens entre projetos diferentes. */
  private async assertItemBelongsToProject(itemId: string, projectId: string) {
    const item = await this.prisma.workItem.findUnique({ where: { id: itemId } });
    if (!item || item.projectId !== projectId) {
      throw new BadRequestException('Item pai inválido para este projeto');
    }
  }

  /** Garante que a etiqueta informada existe e pertence ao projeto esperado, evitando que um item receba etiquetas de outro projeto. */
  private async assertLabelBelongsToProject(labelId: string, projectId: string) {
    const label = await this.prisma.label.findUnique({ where: { id: labelId } });
    if (!label || label.projectId !== projectId) {
      throw new BadRequestException('Etiqueta inválida para este projeto');
    }
  }
}
