import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { GlobalRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

const SAFE_SELECT = {
  id: true,
  email: true,
  fullName: true,
  avatarUrl: true,
  globalRole: true,
  isActive: true,
  createdAt: true,
};

/**
 * Serviço de domínio para gestão de usuários (CRUD, papel global e ativação/desativação).
 * Todas as consultas usam `SAFE_SELECT` para nunca expor `passwordHash` fora deste serviço.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista todos os usuários cadastrados, ordenados por nome.
   * @returns Lista de usuários (campos seguros, sem hash de senha).
   */
  async list() {
    return this.prisma.user.findMany({ select: SAFE_SELECT, orderBy: { fullName: 'asc' } });
  }

  /**
   * Cria um novo usuário, garantindo unicidade de e-mail e persistindo a senha com hash bcrypt.
   * @param dto - Dados de criação (e-mail, senha em texto plano, nome, avatar opcional, papel global opcional).
   * @returns Usuário criado (campos seguros, sem hash de senha).
   * @throws ConflictException - quando já existe um usuário com o mesmo e-mail.
   */
  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Este e-mail já está cadastrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        avatarUrl: dto.avatarUrl || null,
        globalRole: dto.globalRole || GlobalRole.MEMBER,
        // Criado diretamente por um admin: já é confiável, não passa pelo fluxo de
        // confirmação por e-mail nem pela lista de domínios permitidos (só o
        // autocadastro público em /auth/register é restrito por essas regras).
        emailVerifiedAt: new Date(),
      },
      select: SAFE_SELECT,
    });
  }

  /**
   * Busca um usuário pelo id.
   * @param id - Id do usuário.
   * @returns Usuário encontrado (campos seguros, sem hash de senha).
   * @throws NotFoundException - quando não existe usuário com o id informado.
   */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SAFE_SELECT });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  /**
   * Atualiza dados do próprio perfil de um usuário (nome, avatar, senha).
   * Regra de autorização: um usuário não-admin só pode editar o próprio perfil
   * (`requester.id === id`); um ADMIN pode editar o perfil de qualquer usuário.
   * Quando `dto.password` é informado, a senha é re-hasheada com bcrypt antes de salvar.
   * @param id - Id do usuário a ser atualizado.
   * @param dto - Campos a atualizar (nome, avatar e/ou senha), todos opcionais.
   * @param requester - Usuário autenticado que está realizando a requisição.
   * @returns Usuário atualizado (campos seguros, sem hash de senha).
   * @throws ForbiddenException - quando um usuário não-admin tenta editar o perfil de outro usuário.
   */
  async update(id: string, dto: UpdateUserDto, requester: AuthenticatedUser) {
    if (requester.id !== id && requester.globalRole !== GlobalRole.ADMIN) {
      throw new ForbiddenException('Você só pode editar o seu próprio perfil');
    }

    const data: { fullName?: string; avatarUrl?: string | null; passwordHash?: string } = {};
    if (dto.fullName) {
      data.fullName = dto.fullName;
    }
    if (dto.avatarUrl !== undefined) {
      data.avatarUrl = dto.avatarUrl.trim() === '' ? null : dto.avatarUrl.trim();
    }
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const user = await this.prisma.user.update({ where: { id }, data, select: SAFE_SELECT });
    return user;
  }

  /**
   * Altera o papel global (ADMIN/MEMBER/VIEWER) de um usuário. Restrito a administradores
   * no controller (`@Roles(ADMIN)`); este método não repete a checagem de autorização.
   * @param id - Id do usuário.
   * @param globalRole - Novo papel global a ser atribuído.
   * @returns Usuário atualizado (campos seguros, sem hash de senha).
   */
  async updateRole(id: string, globalRole: GlobalRole) {
    return this.prisma.user.update({ where: { id }, data: { globalRole }, select: SAFE_SELECT });
  }

  /**
   * Desativa um usuário (soft-disable via `isActive = false`), sem removê-lo do banco.
   * Restrito a administradores no controller (`@Roles(ADMIN)`).
   * @param id - Id do usuário a ser desativado.
   * @returns Usuário atualizado (campos seguros, sem hash de senha).
   */
  async deactivate(id: string) {
    return this.prisma.user.update({ where: { id }, data: { isActive: false }, select: SAFE_SELECT });
  }
}
