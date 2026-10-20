import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { RUN_TIME_PATTERN } from '../backup-schedule.util.js';

export class UpdateBackupSettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @Matches(RUN_TIME_PATTERN, { message: 'Horário inválido: use HH:MM (ex.: 02:30).' })
  runTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  keepCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  ftpHost?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  ftpPort?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  ftpUser?: string;

  /** Opcional: em branco/ausente mantém a senha já salva (não é devolvida pelo GET). */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  ftpPassword?: string;

  /** Apaga a senha salva (FTP sem senha / anônimo). */
  @IsOptional()
  @IsBoolean()
  clearFtpPassword?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  ftpDirectory?: string;

  @IsOptional()
  @IsBoolean()
  ftpTls?: boolean;

  @IsOptional()
  @IsBoolean()
  ftpWriteOnly?: boolean;
}
