import { Controller, Get, Query } from '@nestjs/common';
import { WorkItemsService } from './work-items.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

/**
 * Endpoint de "itens recentes do usuário atual" (`/me/recent-items`), usado pela home do
 * frontend. Sem `ProjectMemberGuard`/`ProjectResource` porque não é escopado a um projeto
 * específico — a filtragem por visibilidade (admin vê tudo, demais só projetos onde são membros)
 * é feita dentro de `WorkItemsService.listRecentForUser`.
 */
@Controller('me/recent-items')
export class RecentItemsController {
  constructor(private readonly workItemsService: WorkItemsService) {}

  /**
   * Lista os itens mais recentemente atualizados visíveis ao usuário autenticado.
   * @param user - usuário autenticado (injetado via `@CurrentUser()`)
   * @param limit - quantidade máxima de itens, como string da querystring; usa 10 como padrão se ausente ou não numérico
   */
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: string) {
    const parsed = limit ? parseInt(limit, 10) : 10;
    return this.workItemsService.listRecentForUser(user, Number.isFinite(parsed) ? parsed : 10);
  }
}
