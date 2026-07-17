import { Controller, Get, Query } from '@nestjs/common';
import { WorkItemsService } from './work-items.service.js';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

/**
 * Endpoint de "tarefas pendentes atribuídas ao usuário atual" (`/me/recent-items`), usado pela
 * seção "Recentes" da home. Sem `ProjectMemberGuard`/`ProjectResource` porque não é escopado a um
 * projeto específico — o filtro é sempre "atribuído a mim e ainda não concluído/cancelado",
 * resolvido dentro de `WorkItemsService.listPendingForUser`.
 */
@Controller('me/recent-items')
export class RecentItemsController {
  constructor(private readonly workItemsService: WorkItemsService) {}

  /**
   * Lista as tarefas pendentes atribuídas ao usuário autenticado.
   * @param user - usuário autenticado (injetado via `@CurrentUser()`)
   * @param limit - quantidade máxima de itens, como string da querystring; usa 10 como padrão se ausente ou não numérico
   * @param sortBy - `'dueDate'` (padrão) ou `'priority'`; qualquer outro valor cai no padrão
   */
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: string, @Query('sortBy') sortBy?: string) {
    const parsed = limit ? parseInt(limit, 10) : 10;
    const sort = sortBy === 'priority' ? 'priority' : 'dueDate';
    return this.workItemsService.listPendingForUser(user, Number.isFinite(parsed) ? parsed : 10, sort);
  }
}
