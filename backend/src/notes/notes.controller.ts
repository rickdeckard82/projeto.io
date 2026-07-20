import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { NotesService } from './notes.service.js';
import { CreateNoteDto } from './dto/create-note.dto.js';
import { UpdateNoteDto } from './dto/update-note.dto.js';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

/**
 * Controller REST para o bloco de notas pessoal (`/notes`) — não é escopado a projeto, então não
 * usa `ProjectMemberGuard`; qualquer usuário autenticado já passa (não há `@Roles()` em nenhuma
 * rota). Cada nota é privada: a listagem já vem filtrada pelo autor (`NotesService.list`), e
 * editar/remover é restrito a quem criou a nota (checado dentro do próprio `NotesService`).
 */
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  /**
   * Lista as notas do usuário autenticado, mais recentes primeiro.
   * @param limit - quantidade máxima de notas, como string da querystring; sem valor (ou não numérico), retorna todas
   */
  @Get()
  list(@Query('limit') limit: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    const parsed = limit ? parseInt(limit, 10) : undefined;
    return this.notesService.list(user, Number.isFinite(parsed) ? parsed : undefined);
  }

  /** Cria uma nova nota. Qualquer usuário autenticado pode criar (fica visível só para si). */
  @Post()
  create(@Body() dto: CreateNoteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.notesService.create(dto, user);
  }

  /** Atualiza uma nota. Restrito a quem a criou. */
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateNoteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.notesService.update(id, dto, user);
  }

  /** Remove uma nota. Restrito a quem a criou. */
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notesService.remove(id, user);
  }
}
