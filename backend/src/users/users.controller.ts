import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { GlobalRole } from '../generated/prisma/client.js';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

/**
 * Controller REST para gestão de usuários (`/users`). Rotas de leitura e edição do próprio
 * perfil ficam abertas a qualquer usuário autenticado; rotas administrativas (criação,
 * troca de papel e desativação) são restritas a `GlobalRole.ADMIN` via `@Roles(...)`.
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** Lista todos os usuários cadastrados (dados completos, incluindo e-mail). Restrito a administradores — para os seletores de responsável/membro usados por qualquer usuário, ver `GET /users/directory`. */
  @Roles(GlobalRole.ADMIN)
  @Get()
  list() {
    return this.usersService.list();
  }

  /**
   * Lista mínima de usuários (id, nome, avatar — sem e-mail) para os seletores de pessoa
   * (responsável de item, líder de projeto, adicionar membro), abertos a qualquer usuário
   * autenticado. Separado de `GET /users` para não expor e-mail além do necessário
   * (minimização de dados, LGPD art. 6º, III).
   */
  @Get('directory')
  directory() {
    return this.usersService.directory();
  }

  /** Cria um novo usuário. Restrito a administradores. */
  @Roles(GlobalRole.ADMIN)
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  /**
   * Exporta todos os dados pessoais do próprio usuário autenticado (perfil, tarefas criadas
   * e atribuídas, documentos, atividade, participação em projetos) — direito de acesso e
   * portabilidade (LGPD art. 18, II e V). Sempre relativo a quem faz a requisição; não é
   * possível exportar dados de outro usuário por esta rota.
   */
  @Get('me/export')
  exportOwnData(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.exportOwnData(user.id);
  }

  /** Busca um usuário pelo id. */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  /** Atualiza o perfil de um usuário; a checagem de que só o próprio usuário (ou um admin) pode editar é feita no service. */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.update(id, dto, user);
  }

  /** Altera o papel global de um usuário. Restrito a administradores. */
  @Roles(GlobalRole.ADMIN)
  @Patch(':id/role')
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.usersService.updateRole(id, dto.globalRole);
  }

  /** Desativa um usuário (soft-disable). Restrito a administradores. */
  @Roles(GlobalRole.ADMIN)
  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }

  /**
   * Anonimiza um usuário (direito de eliminação de dados pessoais, LGPD art. 18, VI):
   * apaga e-mail/nome/avatar/senha, mantendo o registro para preservar o histórico de
   * projetos. Ação irreversível. Restrito a administradores.
   */
  @Roles(GlobalRole.ADMIN)
  @Patch(':id/anonymize')
  anonymize(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.anonymize(id, user);
  }
}
