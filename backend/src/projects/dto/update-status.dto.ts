import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateStatusDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
