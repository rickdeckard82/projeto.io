import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
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

  /** `null` apaga a data. */
  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  /** `null` apaga a data (e um lembrete relativo a ela). */
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  /**
   * Lembrete em data/hora absoluta; ignorado se `reminderOffsetMinutes` também for informado.
   * `null` limpa o lembrete (junto com `reminderOffsetMinutes`); omitido preserva o valor atual,
   * a menos que `dueDate` mude enquanto houver um lembrete relativo ativo (recalculado — ver
   * `WorkItemsService.update`).
   */
  @IsOptional()
  @IsDateString()
  reminderAt?: string | null;

  /** Lembrete relativo: "avisar N minutos antes do vencimento" — exige `dueDate`. `null` limpa. */
  @IsOptional()
  @IsInt()
  @Min(1)
  reminderOffsetMinutes?: number | null;

  /** `null` desliga a recorrência; omitido preserva o valor atual; um valor a liga/reconfigura. */
  @IsOptional()
  @IsEnum(RecurrenceUnit)
  recurrenceUnit?: RecurrenceUnit | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  recurrenceInterval?: number | null;

  /**
   * `true` marca esta ocorrência como a última da série: concluí-la não gera a próxima. A
   * recorrência em si continua ligada (a série segue contando nas métricas). Ignorado/zerado se a
   * recorrência for desligada no mesmo update.
   */
  @IsOptional()
  @IsBoolean()
  recurrenceEndsHere?: boolean;
}
