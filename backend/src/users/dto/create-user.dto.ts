import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { GlobalRole } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;

  @IsNotEmpty()
  fullName: string;

  @IsOptional()
  @IsString()
  @Matches(/^(https?:\/\/.+)?$/, { message: 'A URL da imagem deve começar com http:// ou https://' })
  avatarUrl?: string;

  @IsOptional()
  @IsEnum(GlobalRole)
  globalRole?: GlobalRole;
}
