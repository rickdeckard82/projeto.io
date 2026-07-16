import { IsBoolean, IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateSmtpSettingsDto {
  @IsString()
  @IsNotEmpty()
  host: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  port: number;

  @IsBoolean()
  useSsl: boolean;

  @IsEmail()
  fromEmail: string;

  @IsString()
  @IsNotEmpty()
  authUser: string;

  /** Opcional: em branco/ausente mantém a senha já salva (não é reenviada pelo GET por segurança). */
  @IsOptional()
  @IsString()
  authPass?: string;
}
