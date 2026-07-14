import { IsBoolean, IsHexColor, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

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
