import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { GlobalRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

const SAFE_SELECT = {
  id: true,
  email: true,
  fullName: true,
  globalRole: true,
  isActive: true,
  createdAt: true,
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.user.findMany({ select: SAFE_SELECT, orderBy: { fullName: 'asc' } });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SAFE_SELECT });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  async update(id: string, dto: UpdateUserDto, requester: AuthenticatedUser) {
    if (requester.id !== id && requester.globalRole !== GlobalRole.ADMIN) {
      throw new ForbiddenException('Você só pode editar o seu próprio perfil');
    }

    const data: { fullName?: string; passwordHash?: string } = {};
    if (dto.fullName) {
      data.fullName = dto.fullName;
    }
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const user = await this.prisma.user.update({ where: { id }, data, select: SAFE_SELECT });
    return user;
  }

  async updateRole(id: string, globalRole: GlobalRole) {
    return this.prisma.user.update({ where: { id }, data: { globalRole }, select: SAFE_SELECT });
  }

  async deactivate(id: string) {
    return this.prisma.user.update({ where: { id }, data: { isActive: false }, select: SAFE_SELECT });
  }
}
