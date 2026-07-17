import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { GlobalRole } from '../generated/prisma/client.js';
import { AllowedDomainsService } from './allowed-domains.service.js';
import { CreateAllowedDomainDto } from './dto/create-allowed-domain.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';

/**
 * Controller REST para a lista de domínios de e-mail autorizados a se autocadastrar
 * (`/settings/allowed-domains`). Restrito a administradores em todas as rotas — diferente de
 * `UsersController.list()`, essa lista não tem consumidor legítimo além da própria tela de
 * configuração administrativa.
 */
@Controller('settings/allowed-domains')
export class AllowedDomainsController {
  constructor(private readonly allowedDomainsService: AllowedDomainsService) {}

  @Roles(GlobalRole.ADMIN)
  @Get()
  list() {
    return this.allowedDomainsService.list();
  }

  @Roles(GlobalRole.ADMIN)
  @Post()
  create(@Body() dto: CreateAllowedDomainDto) {
    return this.allowedDomainsService.create(dto);
  }

  @Roles(GlobalRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.allowedDomainsService.remove(id);
  }
}
