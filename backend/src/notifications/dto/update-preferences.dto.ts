import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  telegramEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  webhookEnabled?: boolean;

  /** Vazio/ausente limpa o chat id salvo. */
  @IsOptional()
  @IsString()
  telegramChatId?: string;

  /** Vazio/ausente limpa a URL (e o segredo) salvos. */
  @IsOptional()
  @IsUrl({ require_tld: false })
  webhookUrl?: string;
}
