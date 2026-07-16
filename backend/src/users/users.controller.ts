import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { GlobalRole } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

/**
 * Controller REST para gestão de usuários (`/users`). Rotas de leitura e edição do próprio
 * perfil ficam abertas a qualquer usuário autenticado; rotas administrativas (criação,
 * troca de papel e desativação) são restritas a `GlobalRole.ADMIN` via `@Roles(...)`.
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** Lista todos os usuários cadastrados. */
  @Get()
  list() {
    return this.usersService.list();
  }

  /** Cria um novo usuário. Restrito a administradores. */
  @Roles(GlobalRole.ADMIN)
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
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
