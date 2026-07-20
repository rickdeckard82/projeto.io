import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateModuleDto } from './dto/create-module.dto.js';
import { UpdateModuleDto } from './dto/update-module.dto.js';

/**
 * Regras de negócio de módulos: agrupamentos opcionais de itens dentro de um projeto (ex.:
 * "Sprint 1", "Backend"). Um módulo não tem kanban próprio — reaproveita as colunas de status já
 * existentes do projeto, servindo só como um recorte (`WorkItem.moduleId`) sobre os itens dele. A
 * validação de acesso ao projeto é feita pelo `ProjectMemberGuard` nos controllers.
 */
@Injectable()
export class ModulesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista os módulos de um projeto.
   * @param projectId - projeto ao qual os módulos pertencem
   * @returns módulos do projeto, em ordem alfabética por nome
   */
  async list(projectId: string) {
    return this.prisma.module.findMany({ where: { projectId }, orderBy: { name: 'asc' } });
  }

  /**
   * Busca um módulo pelo id.
   * @param moduleId - id do módulo
   * @returns o módulo encontrado
   * @throws NotFoundException - se o módulo não existir
   */
  async findOne(moduleId: string) {
    const module = await this.prisma.module.findUnique({ where: { id: moduleId } });
    if (!module) {
      throw new NotFoundException('Módulo não encontrado');
    }
    return module;
  }

  /**
   * Cria um novo módulo no projeto.
   * @param projectId - projeto ao qual o módulo pertencerá
   * @param dto - nome e descrição (opcional) do módulo
   * @returns o módulo criado
   * @throws ConflictException - se já existir um módulo com esse nome no projeto
   */
  async create(projectId: string, dto: CreateModuleDto) {
    await this.assertNameAvailable(projectId, dto.name);
    return this.prisma.module.create({ data: { projectId, name: dto.name, description: dto.description } });
  }

  /**
   * Atualiza nome e/ou descrição de um módulo existente.
   * @param moduleId - id do módulo a atualizar
   * @param dto - campos a atualizar
   * @returns o módulo atualizado
   * @throws NotFoundException - se o módulo não existir
   * @throws ConflictException - se o novo nome já estiver em uso por outro módulo do mesmo projeto
   */
  async update(moduleId: string, dto: UpdateModuleDto) {
    const module = await this.findOne(moduleId);
    if (dto.name && dto.name !== module.name) {
      await this.assertNameAvailable(module.projectId, dto.name);
    }
    return this.prisma.module.update({ where: { id: moduleId }, data: dto });
  }

  /**
   * Remove definitivamente um módulo. Os itens que pertenciam a ele não são apagados — só perdem
   * o vínculo (`WorkItem.moduleId` volta a `null` por `onDelete: SetNull` do schema) e passam a
   * aparecer de novo só na visão geral do projeto.
   * @param moduleId - id do módulo a remover
   * @returns mensagem de confirmação
   * @throws NotFoundException - se o módulo não existir
   */
  async remove(moduleId: string) {
    await this.findOne(moduleId);
    await this.prisma.module.delete({ where: { id: moduleId } });
    return { message: 'Módulo removido' };
  }

  /** Garante que não existe outro módulo com o mesmo nome no projeto (a unicidade é por `[projectId, name]`). */
  private async assertNameAvailable(projectId: string, name: string) {
    const existing = await this.prisma.module.findUnique({ where: { projectId_name: { projectId, name } } });
    if (existing) {
      throw new ConflictException('Já existe um módulo com esse nome neste projeto');
    }
  }
}
