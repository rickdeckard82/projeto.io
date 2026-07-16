import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdatePrivacySettingsDto {
  @IsOptional()
  @IsString()
  controllerName?: string;

  @IsOptional()
  @IsString()
  controllerDocument?: string;

  @IsOptional()
  @IsString()
  dpoName?: string;

  @IsOptional()
  @IsEmail()
  dpoEmail?: string;

  @IsOptional()
  @IsString()
  retentionNotice?: string;

  @IsOptional()
  @IsString()
  additionalNotes?: string;
}
