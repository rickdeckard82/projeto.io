import { IsBoolean, IsHexColor, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Matches(/^[A-Za-z0-9]{2,8}$/, { message: 'ID do projeto deve ter de 2 a 8 letras/números' })
  key?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4)
  icon?: string;

  @IsOptional()
  @IsHexColor()
  coverColor?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
