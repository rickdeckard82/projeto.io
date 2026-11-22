import { IsBoolean, IsOptional, IsString, IsUrl, Matches, ValidateIf } from 'class-validator';

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
  @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'A URL do webhook precisa começar com https://' })
  webhookUrl?: string;

  @IsOptional()
  @IsBoolean()
  pushoverEnabled?: boolean;

  /** Vazio/ausente limpa a User Key salva. */
  @IsOptional()
  @IsString()
  pushoverUserKey?: string;

  @IsOptional()
  @IsBoolean()
  googleChatEnabled?: boolean;

  /** Vazio/ausente limpa a URL salva. */
  @IsOptional()
  @ValidateIf((o) => !!o.googleChatWebhookUrl)
  @Matches(/^https:\/\/chat\.googleapis\.com\//, { message: 'Use a URL de webhook gerada pelo Google Chat (https://chat.googleapis.com/...)' })
  googleChatWebhookUrl?: string;
}
