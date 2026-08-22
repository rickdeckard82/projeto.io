import { IsOptional, IsString } from 'class-validator';

export class UpdatePushoverSettingsDto {
  /** Opcional: em branco/ausente mantém o token já salvo (não é reenviado pelo GET por segurança). */
  @IsOptional()
  @IsString()
  apiToken?: string;
}
