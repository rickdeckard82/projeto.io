import { IsBoolean, IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';

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
  @ValidateIf((o) => !!o.webhookUrl)
  @IsUrl({ require_tld: false })
  webhookUrl?: string;

  @IsOptional()
  @IsBoolean()
  pushoverEnabled?: boolean;

  /** Vazio/ausente limpa a User Key salva. */
  @IsOptional()
  @IsString()
  pushoverUserKey?: string;
}
