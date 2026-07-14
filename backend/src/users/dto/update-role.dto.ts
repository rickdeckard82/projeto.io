import { IsEnum } from 'class-validator';
import { GlobalRole } from '@prisma/client';

export class UpdateRoleDto {
  @IsEnum(GlobalRole)
  globalRole: GlobalRole;
}
