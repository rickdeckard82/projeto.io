import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateLabelDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color deve ser um hex, ex: #3B82F6' })
  color?: string;
}
