import { IsEnum } from 'class-validator';
import { GlobalRole } from '../../generated/prisma/client.js';

export class UpdateRoleDto {
  @IsEnum(GlobalRole)
  globalRole: GlobalRole;
}
