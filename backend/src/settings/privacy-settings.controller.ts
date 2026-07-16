import { Body, Controller, Get, Patch } from '@nestjs/common';
import { GlobalRole } from '@prisma/client';
import { PrivacySettingsService } from './privacy-settings.service';
import { UpdatePrivacySettingsDto } from './dto/update-privacy-settings.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';

/**
 * Controller REST para a configuração de privacidade/LGPD (`/settings/privacy`), singleton.
 * `GET` é público (`@Public()`): o conteúdo não é sensível — é usado tanto pelo formulário
 * de edição do admin quanto pela página pública de Política de Privacidade, acessível mesmo
 * sem login. Só `PATCH` é restrito a administradores.
 */
@Controller('settings/privacy')
export class PrivacySettingsController {
  constructor(private readonly privacySettingsService: PrivacySettingsService) {}

  @Public()
  @Get()
  get() {
    return this.privacySettingsService.get();
  }

  @Roles(GlobalRole.ADMIN)
  @Patch()
  update(@Body() dto: UpdatePrivacySettingsDto) {
    return this.privacySettingsService.update(dto);
  }
}
