import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Priority, RecurrenceUnit } from '../../generated/prisma/client.js';

export class UpdateItemDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @IsUUID()
  moduleId?: string | null;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  /** `null` desliga a recorrência; omitido preserva o valor atual; um valor a liga/reconfigura. */
  @IsOptional()
  @IsEnum(RecurrenceUnit)
  recurrenceUnit?: RecurrenceUnit | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  recurrenceInterval?: number | null;
}
