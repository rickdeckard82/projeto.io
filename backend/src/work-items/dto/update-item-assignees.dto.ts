import { IsArray, IsUUID } from 'class-validator';

export class UpdateItemAssigneesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  userIds: string[];
}
