import { IsArray, IsUUID } from 'class-validator';

export class UpdateItemLabelsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  labelIds: string[];
}
