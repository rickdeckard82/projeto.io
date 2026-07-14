import { IsUUID } from 'class-validator';

export class UpdateItemStatusDto {
  @IsUUID()
  statusId: string;
}
