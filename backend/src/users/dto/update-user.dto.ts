import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(https?:\/\/.+)?$/, { message: 'A URL da imagem deve começar com http:// ou https://' })
  avatarUrl?: string;

  @IsOptional()
  @MinLength(8)
  password?: string;
}
