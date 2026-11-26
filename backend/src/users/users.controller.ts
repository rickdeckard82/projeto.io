import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { GlobalRole } from '../generated/prisma/client.js';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { AllowApiKey } from '../common/decorators/allow-api-key.decorator.js';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { ClientInfo } from '../common/decorators/client-info.decorator.js';
import { AuditService, AuditClientInfo } from '../audit/audit.service.js';
import { AUDIT_ACTIONS } from '../audit/audit-actions.js';

/**
 * Controller REST para gestão de usuários (`/users`). Rotas de leitura e edição do próprio
 * perfil ficam abertas a qualquer usuário autenticado; rotas administrativas (criação,
 * troca de papel e desativação) são restritas a `GlobalRole.ADMIN` via `@Roles(...)`.
 */
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

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
  @AllowApiKey()
  @Get('directory')
  directory() {
    return this.usersService.directory();
  }

  /** Cria um novo usuário. Restrito a administradores. */
  @Roles(GlobalRole.ADMIN)
  @Post()
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
    @ClientInfo() client: AuditClientInfo,
  ) {
    const created = await this.usersService.create(dto);
    await this.auditService.record({
      action: AUDIT_ACTIONS.USER_CREATED,
      actorId: actor.id,
      actorLabel: actor.email,
      targetType: 'user',
      targetId: created.id,
      ip: client.ip,
      userAgent: client.userAgent,
      metadata: { email: dto.email, globalRole: dto.globalRole ?? GlobalRole.MEMBER },
    });
    return created;
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

  /** Atualiza o perfil de um usuário; a checagem de que só o próprio usuário (ou um admin) pode editar é feita no service. */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: AuditClientInfo,
    @Req() req: Request,
  ) {
    const result = await this.usersService.update(id, dto, user, req.cookies?.refresh_token);
    if (dto.password) {
      await this.auditService.record({
        action: AUDIT_ACTIONS.PASSWORD_CHANGED,
        actorId: user.id,
        actorLabel: user.email,
        targetType: 'user',
        targetId: id,
        ip: client.ip,
        userAgent: client.userAgent,
        metadata: { self: user.id === id },
      });
    }
    return result;
  }

  /** Altera o papel global de um usuário. Restrito a administradores. */
  @Roles(GlobalRole.ADMIN)
  @Patch(':id/role')
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
    @ClientInfo() client: AuditClientInfo,
  ) {
    const before = await this.usersService.findOne(id);
    const result = await this.usersService.updateRole(id, dto.globalRole);
    await this.auditService.record({
      action: AUDIT_ACTIONS.USER_ROLE_CHANGED,
      actorId: actor.id,
      actorLabel: actor.email,
      targetType: 'user',
      targetId: id,
      ip: client.ip,
      userAgent: client.userAgent,
      metadata: { from: before?.globalRole ?? null, to: dto.globalRole },
    });
    return result;
  }

  /** Desativa um usuário (soft-disable). Restrito a administradores. */
  @Roles(GlobalRole.ADMIN)
  @Patch(':id/deactivate')
  async deactivate(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @ClientInfo() client: AuditClientInfo,
  ) {
    const result = await this.usersService.deactivate(id);
    await this.auditService.record({
      action: AUDIT_ACTIONS.USER_DEACTIVATED,
      actorId: actor.id,
      actorLabel: actor.email,
      targetType: 'user',
      targetId: id,
      ip: client.ip,
      userAgent: client.userAgent,
    });
    return result;
  }

  /**
   * Anonimiza um usuário (direito de eliminação de dados pessoais, LGPD art. 18, VI):
   * apaga e-mail/nome/avatar/senha, mantendo o registro para preservar o histórico de
   * projetos. Ação irreversível. Restrito a administradores.
   */
  @Roles(GlobalRole.ADMIN)
  @Patch(':id/anonymize')
  async anonymize(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: AuditClientInfo,
  ) {
    const result = await this.usersService.anonymize(id, user);
    await this.auditService.record({
      action: AUDIT_ACTIONS.USER_ANONYMIZED,
      actorId: user.id,
      actorLabel: user.email,
      targetType: 'user',
      targetId: id,
      ip: client.ip,
      userAgent: client.userAgent,
    });
    return result;
  }
}
