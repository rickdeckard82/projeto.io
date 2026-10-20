import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { GlobalRole } from '../generated/prisma/client.js';
import { LabelsService } from './labels.service.js';
import { CreateLabelDto } from './dto/create-label.dto.js';
import { UpdateLabelDto } from './dto/update-label.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';

/**
 * Etiquetas globais (`/labels`), compartilhadas por todos os projetos. Qualquer usuário logado
 * lista; Admin/Senior/Membro criam (inclusive pelo atalho do card no quadro). Renomear, trocar a
 * cor e excluir afetam os itens de todos os projetos, por isso ficam com Admin/Senior.
 */
@Controller('labels')
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Get()
  list() {
    return this.labelsService.list();
  }

  @Roles(GlobalRole.ADMIN, GlobalRole.SENIOR, GlobalRole.MEMBER)
  @Post()
  create(@Body() dto: CreateLabelDto) {
    return this.labelsService.create(dto);
  }

  @Roles(GlobalRole.ADMIN, GlobalRole.SENIOR)
  @Patch(':labelId')
  update(@Param('labelId') labelId: string, @Body() dto: UpdateLabelDto) {
    return this.labelsService.update(labelId, dto);
  }

  @Roles(GlobalRole.ADMIN, GlobalRole.SENIOR)
  @Delete(':labelId')
  remove(@Param('labelId') labelId: string) {
    return this.labelsService.remove(labelId);
  }
}
