import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { NotesService } from './notes.service.js';
import { CreateNoteDto } from './dto/create-note.dto.js';
import { UpdateNoteDto } from './dto/update-note.dto.js';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

/**
 * Controller REST para o mural de notas (`/notes`) — não é escopado a projeto, então não usa
 * `ProjectMemberGuard`; qualquer usuário autenticado já passa (não há `@Roles()` em nenhuma
 * rota). A autorização de editar/remover é feita dentro de `NotesService` (só o autor ou Admin).
 */
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  /**
   * Lista as notas, mais recentes primeiro.
   * @param limit - quantidade máxima de notas, como string da querystring; sem valor (ou não numérico), retorna todas
   */
  @Get()
  list(@Query('limit') limit?: string) {
    const parsed = limit ? parseInt(limit, 10) : undefined;
    return this.notesService.list(Number.isFinite(parsed) ? parsed : undefined);
  }

  /** Cria uma nova nota. Qualquer usuário autenticado pode criar. */
  @Post()
  create(@Body() dto: CreateNoteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.notesService.create(dto, user);
  }

  /** Atualiza uma nota. Restrito a quem a criou ou a um Admin. */
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateNoteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.notesService.update(id, dto, user);
  }

  /** Remove uma nota. Restrito a quem a criou ou a um Admin. */
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notesService.remove(id, user);
  }
}
