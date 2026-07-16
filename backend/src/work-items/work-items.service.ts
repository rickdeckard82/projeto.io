import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ActivityType, Prisma, StatusCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { QueryItemsDto } from './dto/query-items.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

/**
 * Include padrão usado ao carregar um work item: traz os responsáveis (com dados básicos do
 * usuário), as etiquetas, o status atual, o autor e os sub-itens diretos, para que a UI monte o
 * cartão/detalhe do item em uma única consulta, sem N+1.
 */
const ITEM_INCLUDE = {
  assignees: { include: { user: { select: { id: true, email: true, fullName: true, avatarUrl: true } } } },
  labels: { include: { label: true } },
  status: true,
  createdBy: { select: { id: true, email: true, fullName: true, avatarUrl: true } },
  subItems: true,
};

/** Seleção de usuário reaproveitada nas entradas do histórico de atividade de um item. */
const ACTIVITY_USER_SELECT = { select: { id: true, fullName: true, avatarUrl: true } };

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

    const created = await this.prisma.workItem.create({
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

    await this.logActivity(created.id, creator.id, ActivityType.CREATED);

    return created;
  }

  /**
   * Lista as tarefas pendentes atribuídas ao usuário autenticado, para alimentar a seção
   * "Recentes" da home. "Pendente" significa que o status atual do item não é de categoria
   * Concluído nem Cancelado, e que o projeto ao qual pertence não está arquivado (projeto
   * arquivado sai do fluxo ativo de trabalho, então suas tarefas não devem aparecer como
   * pendências). Ordena por vencimento (mais próximos primeiro, sem vencimento por último) ou
   * por prioridade (mais urgente primeiro), sempre com a outra dimensão como critério de
   * desempate.
   * @param user - usuário autenticado que está consultando
   * @param limit - quantidade máxima de itens a retornar
   * @param sortBy - critério de ordenação principal: `'dueDate'` (padrão) ou `'priority'`
   * @returns tarefas pendentes atribuídas ao usuário em projetos ativos, ordenadas conforme `sortBy`
   */
  async listPendingForUser(user: AuthenticatedUser, limit: number, sortBy: 'dueDate' | 'priority' = 'dueDate') {
    const orderBy: Prisma.WorkItemOrderByWithRelationInput[] =
      sortBy === 'priority' ? [{ priority: 'desc' }, { dueDate: 'asc' }] : [{ dueDate: 'asc' }, { priority: 'desc' }];

    return this.prisma.workItem.findMany({
      where: {
        assignees: { some: { userId: user.id } },
        status: { category: { notIn: [StatusCategory.COMPLETED, StatusCategory.CANCELLED] } },
        project: { archivedAt: null },
      },
      include: RECENT_ITEM_INCLUDE,
      orderBy,
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
   * mesmo projeto do item — a hierarquia de sub-itens nunca cruza projetos. Registra no histórico
   * de atividade cada campo que de fato mudou (título e prioridade guardam o valor anterior/novo;
   * descrição só registra que foi editada, sem guardar o texto, para não poluir o histórico).
   * @param id - id do item a atualizar
   * @param dto - campos a atualizar (campos ausentes/`undefined` preservam o valor atual)
   * @param actor - usuário autenticado que está editando (autor das entradas de atividade geradas)
   * @returns o item atualizado, com relações carregadas via {@link ITEM_INCLUDE}
   * @throws NotFoundException - se o item não existir
   * @throws BadRequestException - se `dto.parentId` for o próprio item, ou se o novo pai não pertencer ao mesmo projeto
   */
  async update(id: string, dto: UpdateItemDto, actor: AuthenticatedUser) {
    const item = await this.findOne(id);

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('Um item não pode ser pai de si mesmo');
      }
      await this.assertItemBelongsToProject(dto.parentId, item.projectId);
    }

    const updated = await this.prisma.workItem.update({
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

    if (dto.title !== undefined && dto.title !== item.title) {
      await this.logActivity(id, actor.id, ActivityType.TITLE_CHANGED, { from: item.title, to: dto.title });
    }
    if (dto.description !== undefined && dto.description !== item.description) {
      await this.logActivity(id, actor.id, ActivityType.DESCRIPTION_CHANGED);
    }
    if (dto.priority !== undefined && dto.priority !== item.priority) {
      await this.logActivity(id, actor.id, ActivityType.PRIORITY_CHANGED, { from: item.priority, to: dto.priority });
    }

    return updated;
  }

  /**
   * Move o item para outra coluna do kanban (troca de status). É o método acionado pelo
   * drag-and-drop do board no frontend. Se o novo status for de conclusão/cancelamento e o item
   * tiver sub-itens, exige que todos os sub-itens já estejam concluídos ou cancelados antes de
   * permitir a mudança — um item "pai" só fecha depois que todo o trabalho filho fechou.
   * @param id - id do item
   * @param statusId - id do novo status
   * @param actor - usuário autenticado que está movendo o item (autor da entrada de atividade gerada)
   * @returns o item atualizado
   * @throws NotFoundException - se o item não existir
   * @throws BadRequestException - se o status informado não pertencer ao mesmo projeto do item, ou se houver sub-itens ainda não concluídos/cancelados e o novo status for de conclusão/cancelamento
   */
  async updateStatus(id: string, statusId: string, actor: AuthenticatedUser) {
    const item = await this.findOne(id);
    const status = await this.assertStatusBelongsToProject(statusId, item.projectId);

    if (status.category === StatusCategory.COMPLETED || status.category === StatusCategory.CANCELLED) {
      const subItems = await this.prisma.workItem.findMany({
        where: { parentId: id },
        include: { status: true },
      });
      const unfinished = subItems.filter(
        (s) => s.status.category !== StatusCategory.COMPLETED && s.status.category !== StatusCategory.CANCELLED,
      );
      if (unfinished.length > 0) {
        throw new BadRequestException(
          'Não é possível concluir ou cancelar este item enquanto houver sub-itens não finalizados ou cancelados.',
        );
      }
    }

    const updated = await this.prisma.workItem.update({ where: { id }, data: { statusId }, include: ITEM_INCLUDE });

    if (item.statusId !== statusId) {
      await this.logActivity(id, actor.id, ActivityType.STATUS_CHANGED, {
        from: item.status.name,
        to: status.name,
      });
    }

    return updated;
  }

  /**
   * Substitui integralmente a lista de responsáveis do item pela lista informada (remove todos os
   * vínculos atuais e recria os novos dentro de uma transação, para evitar estado parcial).
   * @param id - id do item
   * @param userIds - ids dos usuários que passarão a ser os únicos responsáveis pelo item
   * @param actor - usuário autenticado que está alterando os responsáveis (autor das entradas de atividade geradas)
   * @returns o item atualizado, com a nova lista de responsáveis
   * @throws NotFoundException - se o item não existir
   */
  async updateAssignees(id: string, userIds: string[], actor: AuthenticatedUser) {
    const item = await this.findOne(id);
    const previousIds = item.assignees.map((a) => a.userId);

    await this.prisma.$transaction([
      this.prisma.itemAssignee.deleteMany({ where: { workItemId: id } }),
      this.prisma.itemAssignee.createMany({
        data: userIds.map((userId) => ({ workItemId: id, userId })),
        skipDuplicates: true,
      }),
    ]);

    const added = userIds.filter((uid) => !previousIds.includes(uid));
    const removed = previousIds.filter((uid) => !userIds.includes(uid));
    if (added.length > 0 || removed.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: [...added, ...removed] } },
        select: { id: true, fullName: true },
      });
      const nameOf = (uid: string) => users.find((u) => u.id === uid)?.fullName;
      for (const uid of added) {
        await this.logActivity(id, actor.id, ActivityType.ASSIGNEE_ADDED, { userName: nameOf(uid) });
      }
      for (const uid of removed) {
        await this.logActivity(id, actor.id, ActivityType.ASSIGNEE_REMOVED, { userName: nameOf(uid) });
      }
    }

    return this.findOne(id);
  }

  /**
   * Substitui integralmente a lista de etiquetas do item pela lista informada (mesma estratégia
   * de "apagar tudo e recriar" de {@link updateAssignees}, dentro de uma transação). Cada etiqueta
   * é validada individualmente contra o projeto do item antes da troca.
   * @param id - id do item
   * @param labelIds - ids das etiquetas que passarão a ser as únicas associadas ao item
   * @param actor - usuário autenticado que está alterando as etiquetas (autor das entradas de atividade geradas)
   * @returns o item atualizado, com a nova lista de etiquetas
   * @throws NotFoundException - se o item não existir
   * @throws BadRequestException - se alguma etiqueta informada não pertencer ao projeto do item
   */
  async updateLabels(id: string, labelIds: string[], actor: AuthenticatedUser) {
    const item = await this.findOne(id);
    for (const labelId of labelIds) {
      await this.assertLabelBelongsToProject(labelId, item.projectId);
    }
    const previousIds = item.labels.map((l) => l.labelId);

    await this.prisma.$transaction([
      this.prisma.itemLabel.deleteMany({ where: { workItemId: id } }),
      this.prisma.itemLabel.createMany({
        data: labelIds.map((labelId) => ({ workItemId: id, labelId })),
        skipDuplicates: true,
      }),
    ]);

    const added = labelIds.filter((lid) => !previousIds.includes(lid));
    const removed = previousIds.filter((lid) => !labelIds.includes(lid));
    if (added.length > 0 || removed.length > 0) {
      const labelRows = await this.prisma.label.findMany({
        where: { id: { in: [...added, ...removed] } },
        select: { id: true, name: true, color: true },
      });
      const infoOf = (lid: string) => labelRows.find((l) => l.id === lid);
      for (const lid of added) {
        const label = infoOf(lid);
        await this.logActivity(id, actor.id, ActivityType.LABEL_ADDED, { name: label?.name, color: label?.color });
      }
      for (const lid of removed) {
        const label = infoOf(lid);
        await this.logActivity(id, actor.id, ActivityType.LABEL_REMOVED, { name: label?.name, color: label?.color });
      }
    }

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

  /**
   * Lista o histórico de atividade de um item (eventos automáticos como mudança de status/
   * prioridade/etiquetas/responsáveis, mais os comentários), em ordem cronológica crescente, para
   * montar a timeline "Atividade" no detalhe do item.
   * @param workItemId - id do item
   * @returns entradas de atividade com o autor (`user`) de cada uma
   */
  async listActivities(workItemId: string) {
    return this.prisma.itemActivity.findMany({
      where: { workItemId },
      include: { user: ACTIVITY_USER_SELECT },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Adiciona um comentário ao item, registrado como mais uma entrada na timeline de atividade
   * (`type: COMMENT`).
   * @param workItemId - id do item
   * @param message - texto do comentário
   * @param actor - usuário autenticado que está comentando
   * @returns a entrada de atividade criada, com o autor (`user`)
   * @throws NotFoundException - se o item não existir
   */
  async addComment(workItemId: string, message: string, actor: AuthenticatedUser) {
    await this.findOne(workItemId);
    return this.prisma.itemActivity.create({
      data: { workItemId, userId: actor.id, type: ActivityType.COMMENT, message },
      include: { user: ACTIVITY_USER_SELECT },
    });
  }

  /** Registra uma entrada no histórico de atividade de um item. `metadata` guarda os detalhes específicos de cada tipo de evento (ex.: valor anterior/novo) usados pelo frontend para montar a mensagem exibida. */
  private async logActivity(
    workItemId: string,
    userId: string,
    type: ActivityType,
    metadata?: Prisma.InputJsonValue,
  ) {
    await this.prisma.itemActivity.create({ data: { workItemId, userId, type, metadata } });
  }

  /** Garante que o status informado existe e pertence ao projeto esperado, evitando que um item receba um status de outro projeto; retorna o status encontrado para reaproveitamento (ex.: checar sua `category`). */
  private async assertStatusBelongsToProject(statusId: string, projectId: string) {
    const status = await this.prisma.status.findUnique({ where: { id: statusId } });
    if (!status || status.projectId !== projectId) {
      throw new BadRequestException('Status inválido para este projeto');
    }
    return status;
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
