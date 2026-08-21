import { IsOptional, IsString } from 'class-validator';

export class UpdateTelegramSettingsDto {
  /** Opcional: em branco/ausente mantém o token já salvo (não é reenviado pelo GET por segurança). */
  @IsOptional()
  @IsString()
  botToken?: string;

  @IsOptional()
  @IsString()
  botUsername?: string;
}
