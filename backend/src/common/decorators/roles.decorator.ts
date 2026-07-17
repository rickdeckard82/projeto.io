import { SetMetadata } from '@nestjs/common';
import { GlobalRole } from '../../generated/prisma/client.js';

export const ROLES_KEY = 'roles';

/**
 * Anexa ao handler/classe a lista de papéis globais permitidos, lida
 * depois pelo `RolesGuard` para autorizar ou não o acesso à rota.
 * @param roles - papéis globais (`GlobalRole`) autorizados a acessar a rota
 */
export const Roles = (...roles: GlobalRole[]) => SetMetadata(ROLES_KEY, roles);
