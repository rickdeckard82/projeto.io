import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Priority, RecurrenceUnit } from '../../generated/prisma/client.js';

export class CreateItemDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  statusId?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsUUID()
  moduleId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  /** Lembrete em data/hora absoluta. Ignorado se `reminderOffsetMinutes` também for informado. */
  @IsOptional()
  @IsDateString()
  reminderAt?: string;

  /** Lembrete relativo: "avisar N minutos antes do vencimento" — exige `dueDate`. */
  @IsOptional()
  @IsInt()
  @Min(1)
  reminderOffsetMinutes?: number;

  @IsOptional()
  @IsEnum(RecurrenceUnit)
  recurrenceUnit?: RecurrenceUnit;

  @IsOptional()
  @IsInt()
  @Min(1)
  recurrenceInterval?: number;
}
