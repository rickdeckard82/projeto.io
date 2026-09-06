import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ActivityType, GlobalRole, NotificationType, Prisma, RecurrenceUnit, StatusCategory } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateItemDto } from './dto/create-item.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';
import { QueryItemsDto } from './dto/query-items.dto.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import { NotificationsService } from '../notifications/notifications.service.js';

/**
 * Include padrão usado ao carregar um work item: traz os responsáveis (com dados básicos do
 * usuário), as etiquetas, o status atual, o autor e os sub-itens diretos, para que a UI monte o
 * cartão/detalhe do item em uma única consulta, sem N+1.
 */
const ITEM_INCLUDE = {
  assignees: { include: { user: { select: { id: true, email: true, fullName: true, avatarUrl: true } } } },
  labels: { include: { label: true } },
  status: true,
  module: { select: { id: true, name: true } },
  createdBy: { select: { id: true, email: true, fullName: true, avatarUrl: true } },
  statusLockedBy: { select: { id: true, fullName: true, avatarUrl: true } },
  subItems: { include: { status: true } },
};

/** Seleção de usuário reaproveitada nas entradas do histórico de atividade de um item. */
const ACTIVITY_USER_SELECT = { select: { id: true, fullName: true, avatarUrl: true } };

/**
 * Resolve a combinação final de `recurrenceUnit`/`recurrenceInterval` a partir do que foi
 * informado: sem `unit`, o item não é recorrente e `interval` não faz sentido sozinho (ambos
 * viram `null`); com `unit` mas sem `interval`, assume `1` (ex.: só "WEEK" = a cada 1 semana).
 */
function normalizeRecurrence(
  unit: RecurrenceUnit | undefined,
  interval: number | undefined,
): { unit: RecurrenceUnit | null; interval: number | null } {
  if (!unit) return { unit: null, interval: null };
  return { unit, interval: interval ?? 1 };
}

/** Soma `interval` unidades de `unit` a `date`, sem alterar `date`. Mês trata corretamente o fim do mês (ex.: 31/jan + 1 mês = 28/fev, não 3/mar). */
function addRecurrenceInterval(date: Date, unit: RecurrenceUnit, interval: number): Date {
  const result = new Date(date);
  if (unit === 'DAY') {
    result.setDate(result.getDate() + interval);
    return result;
  }
  if (unit === 'WEEK') {
    result.setDate(result.getDate() + interval * 7);
    return result;
  }
  const originalDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + interval);
  const daysInTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(originalDay, daysInTargetMonth));
  return result;
}

/**
 * Resolve o lembrete customizado a partir do que foi informado: `offsetMinutes` define um lembrete
 * relativo ("N minutos antes do vencimento", recalculado sempre que `dueDate` muda) e exige que o
 * item tenha vencimento; `at` sozinho define um lembrete em data/hora absoluta; nenhum dos dois
 * limpa o lembrete (usado tanto quando o usuário limpa explicitamente quanto quando o item nunca
 * teve um lembrete).
 */
function resolveReminder(
  at: string | null | undefined,
  offsetMinutes: number | null | undefined,
  dueDate: Date | null,
): { reminderAt: Date | null; reminderOffsetMinutes: number | null } {
  if (offsetMinutes) {
    if (!dueDate) {
      throw new BadRequestException('Defina o vencimento antes de configurar um lembrete relativo a ele.');
    }
    return { reminderAt: new Date(dueDate.getTime() - offsetMinutes * 60_000), reminderOffsetMinutes: offsetMinutes };
  }
  if (at) {
    return { reminderAt: new Date(at), reminderOffsetMinutes: null };
  }
  return { reminderAt: null, reminderOffsetMinutes: null };
}

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Lista os itens de um projeto, aplicando os filtros opcionais vindos da querystring.
   * `parentId` tem tratamento especial: o valor literal `'null'` (string) filtra itens de topo
   * (sem pai), enquanto um id filtra os sub-itens daquele pai; omitir o parâmetro não filtra por
   * hierarquia.
   * @param projectId - projeto ao qual os itens pertencem
   * @param query - filtros opcionais (`statusId`, `assigneeId`, `labelId`, `moduleId`, `parentId`)
   * @returns itens do projeto que casam com os filtros, ordenados por data de criação (mais antigos primeiro)
   */
  async list(projectId: string, query: QueryItemsDto) {
    const where: any = { projectId };
    if (query.statusId) where.statusId = query.statusId;
    if (query.assigneeId) where.assignees = { some: { userId: query.assigneeId } };
    if (query.labelId) where.labels = { some: { labelId: query.labelId } };
    if (query.moduleId) where.moduleId = query.moduleId;
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
   * @throws ForbiddenException - se o projeto estiver arquivado (ver {@link assertProjectNotArchived})
   * @throws BadRequestException - se o projeto não tiver nenhum status configurado, se o `statusId` informado não pertencer ao projeto, se o `parentId` informado não pertencer ao projeto, ou se o `moduleId` informado não pertencer ao projeto
   */
  async create(projectId: string, dto: CreateItemDto, creator: AuthenticatedUser) {
    await this.assertProjectNotArchived(projectId);

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

    if (dto.moduleId) {
      await this.assertModuleBelongsToProject(dto.moduleId, projectId);
    }

    const initialStatus = await this.prisma.status.findUniqueOrThrow({ where: { id: statusId } });
    const recurrence = normalizeRecurrence(dto.recurrenceUnit, dto.recurrenceInterval);
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    const reminder = resolveReminder(dto.reminderAt, dto.reminderOffsetMinutes, dueDate);

    const created = await this.prisma.workItem.create({
      data: {
        projectId,
        title: dto.title,
        description: dto.description,
        statusId,
        priority: dto.priority,
        parentId: dto.parentId,
        moduleId: dto.moduleId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dueDate ?? undefined,
        reminderAt: reminder.reminderAt,
        reminderOffsetMinutes: reminder.reminderOffsetMinutes,
        createdById: creator.id,
        inProgressSince: initialStatus.category === StatusCategory.STARTED ? new Date() : undefined,
        recurrenceUnit: recurrence.unit,
        recurrenceInterval: recurrence.interval,
      },
      include: ITEM_INCLUDE,
    });

    await this.logActivity(created.id, creator.id, ActivityType.CREATED);
    this.realtimeGateway.emitItemsChanged(projectId);

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
   * @throws ForbiddenException - se o projeto do item estiver arquivado
   * @throws BadRequestException - se `dto.parentId` for o próprio item, se o novo pai não pertencer ao mesmo projeto, ou se `dto.moduleId` não pertencer ao mesmo projeto
   */
  async update(id: string, dto: UpdateItemDto, actor: AuthenticatedUser) {
    const item = await this.findOne(id);
    await this.assertProjectNotArchived(item.projectId);

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('Um item não pode ser pai de si mesmo');
      }
      await this.assertItemBelongsToProject(dto.parentId, item.projectId);
    }

    if (dto.moduleId) {
      await this.assertModuleBelongsToProject(dto.moduleId, item.projectId);
    }

    const recurrenceGiven = dto.recurrenceUnit !== undefined || dto.recurrenceInterval !== undefined;
    const recurrence = recurrenceGiven
      ? normalizeRecurrence(
          (dto.recurrenceUnit !== undefined ? dto.recurrenceUnit : item.recurrenceUnit) ?? undefined,
          (dto.recurrenceInterval !== undefined ? dto.recurrenceInterval : item.recurrenceInterval) ?? undefined,
        )
      : undefined;

    // "Esta é a última ocorrência": só faz sentido com a recorrência ligada — se o update
    // desligar a recorrência, zera o flag junto; senão, `undefined` preserva o valor atual.
    const recurrenceEndsHere =
      recurrenceGiven && !recurrence!.unit ? false : dto.recurrenceEndsHere;

    // Prazo mudou de fato (não só foi reenviado com o mesmo valor): zera os timestamps de disparo
    // do alerta de vencimento, senão um item cujo prazo foi adiado depois de já notificado nunca
    // dispararia de novo — ver `DueDateCheckService`.
    const dueDateChanged = !!dto.dueDate && new Date(dto.dueDate).getTime() !== item.dueDate?.getTime();
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : item.dueDate;

    // Lembrete: recalcula se o usuário mexeu nele diretamente, ou se ele é relativo e o vencimento
    // mudou (senão um lembrete "30min antes" ficaria preso ao prazo antigo).
    const reminderGiven = dto.reminderAt !== undefined || dto.reminderOffsetMinutes !== undefined;
    const reminder = reminderGiven
      ? resolveReminder(dto.reminderAt, dto.reminderOffsetMinutes, dueDate)
      : dueDateChanged && item.reminderOffsetMinutes != null
        ? resolveReminder(undefined, item.reminderOffsetMinutes, dueDate)
        : undefined;
    const reminderChanged = reminder && reminder.reminderAt?.getTime() !== item.reminderAt?.getTime();

    const updated = await this.prisma.workItem.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        parentId: dto.parentId === undefined ? undefined : dto.parentId,
        moduleId: dto.moduleId === undefined ? undefined : dto.moduleId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        reminderAt: reminder ? reminder.reminderAt : undefined,
        reminderOffsetMinutes: reminder ? reminder.reminderOffsetMinutes : undefined,
        reminderNotifiedAt: reminderChanged ? null : undefined,
        recurrenceUnit: recurrenceGiven ? recurrence!.unit : undefined,
        recurrenceInterval: recurrenceGiven ? recurrence!.interval : undefined,
        recurrenceEndsHere,
        dueSoonNotifiedAt: dueDateChanged ? null : undefined,
        overdueNotifiedAt: dueDateChanged ? null : undefined,
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

    this.realtimeGateway.emitItemsChanged(item.projectId);
    this.realtimeGateway.emitActivityChanged(item.projectId, id);
    return updated;
  }

  /**
   * Move o item para outra coluna do kanban (troca de status). É o método acionado pelo
   * drag-and-drop do board no frontend. Sair do Backlog exige ao menos um responsável já
   * atribuído — evita que um item comece a andar sem que fique claro quem é dono dele. Se o novo
   * status for de conclusão/cancelamento e o item tiver sub-itens, exige que todos os sub-itens já
   * estejam concluídos ou cancelados antes de permitir a mudança — um item "pai" só fecha depois
   * que todo o trabalho filho fechou.
   *
   * Trava de "Em andamento": quando alguém move um item para um status de categoria `STARTED`,
   * `statusLockedById` grava quem foi; enquanto o item continuar em `STARTED`, só essa pessoa
   * (ou um Admin) pode mudar o status de novo — evita que outro colega "roube" ou finalize uma
   * tarefa que já está sendo trabalhada por alguém. Sair de `STARTED` (concluir, cancelar, ou
   * voltar) limpa a trava.
   *
   * Um item que já chegou em `COMPLETED`/`CANCELLED` fica travado — ninguém além de um Admin
   * consegue movê-lo de novo (nem para outro status de conclusão/cancelamento, nem de volta ao
   * fluxo ativo), para o board não virar um lugar onde tarefas "fechadas" continuam sendo mexidas.
   *
   * Junto disso, mede quanto tempo o item passa "em andamento": ao entrar em `STARTED` grava
   * `inProgressSince`; ao sair, soma o intervalo decorrido em `inProgressSeconds` e limpa
   * `inProgressSince` — cobre também o caso de o item sair e voltar pra `STARTED` mais de uma vez.
   * Quando o item chega em `COMPLETED`, `inProgressSeconds` é o tempo real "em andamento" da
   * tarefa, usado por `MetricsService` para as métricas por item e o tempo de execução do projeto.
   *
   * Notifica os responsáveis (`TASK_COMPLETED`/`TASK_CANCELLED`) numa transição de fato para uma
   * categoria fechada — não dispara de novo se o item já estava em `COMPLETED`/`CANCELLED` e um
   * Admin só trocou entre dois status da mesma categoria fechada.
   * @param id - id do item
   * @param statusId - id do novo status
   * @param actor - usuário autenticado que está movendo o item (autor da entrada de atividade gerada)
   * @returns o item atualizado
   * @throws NotFoundException - se o item não existir
   * @throws ForbiddenException - se o projeto do item estiver arquivado, se o item estiver travado por outro usuário (em "Em andamento") e quem está tentando mudar não for nem quem travou nem um Admin, ou se o item já estiver concluído/cancelado e quem está tentando mudar não for Admin
   * @throws BadRequestException - se o status informado não pertencer ao mesmo projeto do item, se o item ainda estiver no Backlog sem nenhum responsável definido, ou se houver sub-itens ainda não concluídos/cancelados e o novo status for de conclusão/cancelamento
   */
  async updateStatus(id: string, statusId: string, actor: AuthenticatedUser) {
    const item = await this.findOne(id);
    await this.assertProjectNotArchived(item.projectId);
    const status = await this.assertStatusBelongsToProject(statusId, item.projectId);

    if (
      item.status.category === StatusCategory.STARTED &&
      item.statusLockedById &&
      item.statusLockedById !== actor.id &&
      actor.globalRole !== GlobalRole.ADMIN
    ) {
      throw new ForbiddenException(
        `Este item está travado por ${item.statusLockedBy?.fullName} enquanto estiver "Em andamento" — só essa pessoa (ou um Admin) pode mudar o status.`,
      );
    }

    if (item.status.category === StatusCategory.BACKLOG && status.category !== StatusCategory.BACKLOG && item.assignees.length === 0) {
      throw new BadRequestException('Defina ao menos um responsável antes de tirar este item do Backlog.');
    }

    if (
      item.statusId !== statusId &&
      (item.status.category === StatusCategory.COMPLETED || item.status.category === StatusCategory.CANCELLED) &&
      actor.globalRole !== GlobalRole.ADMIN
    ) {
      throw new ForbiddenException('Este item já está concluído ou cancelado e não pode mais ser movido — só um Admin pode reabri-lo.');
    }

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

    const now = new Date();
    const leavingStarted = item.status.category === StatusCategory.STARTED && status.category !== StatusCategory.STARTED;
    const enteringStarted = item.status.category !== StatusCategory.STARTED && status.category === StatusCategory.STARTED;

    let inProgressSeconds = item.inProgressSeconds;
    let inProgressSince: Date | null = item.inProgressSince;
    if (leavingStarted && item.inProgressSince) {
      inProgressSeconds += Math.round((now.getTime() - item.inProgressSince.getTime()) / 1000);
      inProgressSince = null;
    } else if (enteringStarted) {
      inProgressSince = now;
    }

    const updated = await this.prisma.workItem.update({
      where: { id },
      data: {
        statusId,
        statusLockedById: status.category === StatusCategory.STARTED ? actor.id : null,
        inProgressSince,
        inProgressSeconds,
      },
      include: ITEM_INCLUDE,
    });

    if (item.statusId !== statusId) {
      await this.logActivity(id, actor.id, ActivityType.STATUS_CHANGED, {
        from: item.status.name,
        to: status.name,
      });
    }

    // Notifica os responsáveis só numa transição de fato para concluído/cancelado — evita
    // renotificar quando um Admin move o item entre dois status da mesma categoria fechada.
    const enteringClosed =
      item.status.category !== status.category &&
      (status.category === StatusCategory.COMPLETED || status.category === StatusCategory.CANCELLED);
    if (enteringClosed && item.assignees.length > 0) {
      const project = await this.prisma.project.findUniqueOrThrow({ where: { id: item.projectId }, select: { name: true } });
      const type = status.category === StatusCategory.COMPLETED ? NotificationType.TASK_COMPLETED : NotificationType.TASK_CANCELLED;
      const verb = status.category === StatusCategory.COMPLETED ? 'foi concluída' : 'foi cancelada';
      for (const assignee of item.assignees) {
        await this.notificationsService.create({
          userId: assignee.userId,
          type,
          title: `"${item.title}" ${verb} — ${project.name}`,
          link: `/projects/${item.projectId}/board?item=${id}`,
          metadata: { workItemId: id, projectId: item.projectId },
        });
      }
    }

    // Gera a próxima ocorrência ao concluir — a menos que este item tenha sido marcado como o
    // último da série (`recurrenceEndsHere`), caso em que a série simplesmente termina aqui.
    if (status.category === StatusCategory.COMPLETED && item.recurrenceUnit && !item.recurrenceEndsHere) {
      await this.generateNextOccurrence(item, item.recurrenceUnit, item.recurrenceInterval ?? 1, actor);
    }

    this.realtimeGateway.emitItemsChanged(item.projectId);
    this.realtimeGateway.emitActivityChanged(item.projectId, id);
    return updated;
  }

  /**
   * Cria a próxima ocorrência de um item recorrente ao ser concluído. Copia título, descrição,
   * prioridade, módulo, etiquetas e a própria recorrência (para a série continuar) — não copia
   * responsáveis de propósito, a nova ocorrência começa sem dono definido. Entra sempre no
   * primeiro status do projeto (menor `position`, o mesmo padrão usado por {@link create} quando
   * nenhum `statusId` é informado). Datas avançam `interval` unidades de `unit` a partir das datas
   * do item concluído; sem nenhuma data original, a nova ocorrência ganha um `dueDate` calculado a
   * partir de agora, para dar um alvo — ver {@link addRecurrenceInterval}.
   * @param completedItem - o item que acabou de ser concluído (já com relações carregadas)
   * @param unit - unidade de recorrência do item concluído
   * @param interval - intervalo (em `unit`) do item concluído
   * @param actor - usuário que concluiu o item (autor da nova ocorrência)
   */
  private async generateNextOccurrence(
    completedItem: Awaited<ReturnType<typeof this.findOne>>,
    unit: RecurrenceUnit,
    interval: number,
    actor: AuthenticatedUser,
  ) {
    const firstStatus = await this.prisma.status.findFirst({
      where: { projectId: completedItem.projectId },
      orderBy: { position: 'asc' },
    });
    if (!firstStatus) return;

    const hasStart = !!completedItem.startDate;
    const hasDue = !!completedItem.dueDate;
    const basis = completedItem.dueDate ?? completedItem.startDate ?? new Date();
    const nextDueDate = hasDue || (!hasStart && !hasDue) ? addRecurrenceInterval(basis, unit, interval) : undefined;
    const nextStartDate = hasStart ? addRecurrenceInterval(completedItem.startDate!, unit, interval) : undefined;

    const next = await this.prisma.workItem.create({
      data: {
        projectId: completedItem.projectId,
        title: completedItem.title,
        description: completedItem.description,
        statusId: firstStatus.id,
        priority: completedItem.priority,
        moduleId: completedItem.moduleId,
        startDate: nextStartDate,
        dueDate: nextDueDate,
        createdById: actor.id,
        recurrenceUnit: unit,
        recurrenceInterval: interval,
        recurrenceCount: completedItem.recurrenceCount + 1,
        labels: { createMany: { data: completedItem.labels.map((l) => ({ labelId: l.labelId })) } },
      },
    });

    await this.logActivity(next.id, actor.id, ActivityType.CREATED);
    await this.logActivity(completedItem.id, actor.id, ActivityType.RECURRENCE_GENERATED, {
      newItemId: next.id,
      newItemTitle: next.title,
    });
  }

  /**
   * Substitui integralmente a lista de responsáveis do item pela lista informada (remove todos os
   * vínculos atuais e recria os novos dentro de uma transação, para evitar estado parcial).
   * @param id - id do item
   * @param userIds - ids dos usuários que passarão a ser os únicos responsáveis pelo item
   * @param actor - usuário autenticado que está alterando os responsáveis (autor das entradas de atividade geradas)
   * @returns o item atualizado, com a nova lista de responsáveis
   * @throws NotFoundException - se o item não existir
   * @throws ForbiddenException - se o projeto do item estiver arquivado
   */
  async updateAssignees(id: string, userIds: string[], actor: AuthenticatedUser) {
    const item = await this.findOne(id);
    await this.assertProjectNotArchived(item.projectId);
    const previousIds = item.assignees.map((a) => a.userId);
    const project = await this.prisma.project.findUniqueOrThrow({ where: { id: item.projectId }, select: { name: true } });

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
        await this.notificationsService.create({
          userId: uid,
          type: NotificationType.TASK_ASSIGNED,
          title: `Você foi atribuído a "${item.title}" — ${project.name}`,
          link: `/projects/${item.projectId}/board?item=${id}`,
          metadata: { workItemId: id, projectId: item.projectId },
        });
      }
      for (const uid of removed) {
        await this.logActivity(id, actor.id, ActivityType.ASSIGNEE_REMOVED, { userName: nameOf(uid) });
      }
    }

    this.realtimeGateway.emitItemsChanged(item.projectId);
    this.realtimeGateway.emitActivityChanged(item.projectId, id);
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
   * @throws ForbiddenException - se o projeto do item estiver arquivado
   * @throws BadRequestException - se alguma etiqueta informada não pertencer ao projeto do item
   */
  async updateLabels(id: string, labelIds: string[], actor: AuthenticatedUser) {
    const item = await this.findOne(id);
    await this.assertProjectNotArchived(item.projectId);
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

    this.realtimeGateway.emitItemsChanged(item.projectId);
    this.realtimeGateway.emitActivityChanged(item.projectId, id);
    return this.findOne(id);
  }

  /**
   * Remove definitivamente um item de trabalho.
   * @param id - id do item a remover
   * @returns mensagem de confirmação
   * @throws NotFoundException - se o item não existir
   * @throws ForbiddenException - se o projeto do item estiver arquivado
   */
  async remove(id: string) {
    const item = await this.findOne(id);
    await this.assertProjectNotArchived(item.projectId);
    await this.prisma.workItem.delete({ where: { id } });
    this.realtimeGateway.emitItemsChanged(item.projectId);
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
   * @throws ForbiddenException - se o projeto do item estiver arquivado
   */
  async addComment(workItemId: string, message: string, actor: AuthenticatedUser) {
    const item = await this.findOne(workItemId);
    await this.assertProjectNotArchived(item.projectId);
    const created = await this.prisma.itemActivity.create({
      data: { workItemId, userId: actor.id, type: ActivityType.COMMENT, message },
      include: { user: ACTIVITY_USER_SELECT },
    });
    this.realtimeGateway.emitActivityChanged(item.projectId, workItemId);
    return created;
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

  /**
   * Garante que o projeto do item não está arquivado antes de aceitar qualquer escrita — sem essa
   * checagem, um usuário com o board já aberto continuava criando/editando/movendo itens
   * normalmente depois que outro usuário arquivava o projeto, até recarregar a página (o aviso em
   * tempo real do arquivamento, feito por {@link RealtimeGateway.emitProjectChanged}, é só UX;
   * esta é a garantia de verdade, do lado do servidor).
   * @throws ForbiddenException - se o projeto estiver arquivado
   */
  private async assertProjectNotArchived(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { archivedAt: true } });
    if (project?.archivedAt) {
      throw new ForbiddenException('Este projeto está arquivado — não é possível fazer alterações nele.');
    }
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

  /** Garante que o módulo informado existe e pertence ao projeto esperado, evitando que um item seja associado a um módulo de outro projeto. */
  private async assertModuleBelongsToProject(moduleId: string, projectId: string) {
    const module = await this.prisma.module.findUnique({ where: { id: moduleId } });
    if (!module || module.projectId !== projectId) {
      throw new BadRequestException('Módulo inválido para este projeto');
    }
  }
}
