import { IsOptional, IsUUID } from 'class-validator';

export class QueryItemsDto {
  @IsOptional()
  @IsUUID()
  statusId?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsUUID()
  labelId?: string;

  @IsOptional()
  @IsUUID()
  moduleId?: string;

  @IsOptional()
  parentId?: string; // pass "null" string to filter top-level items
}
