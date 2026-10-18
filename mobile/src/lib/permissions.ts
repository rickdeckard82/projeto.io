import { GlobalRole, User, WorkItem } from '../types';

// Mesmas regras de `frontend/src/lib/permissions.ts` e do `ItemDetailModal` web — só conveniência
// visual (esconder/desabilitar controles); a garantia real é sempre o backend.

/** Admin, Senior e Membro editam itens; Visualizador não. */
export const canEditItem = (role: GlobalRole) => role === 'ADMIN' || role === 'SENIOR' || role === 'MEMBER';

/**
 * Por que o status do item não pode ser trocado por este usuário, ou `null` se pode:
 * - item em "Em andamento" travado por outra pessoa (só ela ou um Admin destrava);
 * - item já concluído/cancelado (só Admin reabre).
 */
export function statusLockReason(item: WorkItem, user: User): string | null {
  if (user.globalRole === 'ADMIN') return null;
  if (item.status.category === 'COMPLETED' || item.status.category === 'CANCELLED') {
    return 'Item encerrado — só um administrador pode movê-lo.';
  }
  if (item.statusLockedById && item.statusLockedById !== user.id) {
    return `Em andamento com ${item.statusLockedBy?.fullName ?? 'outra pessoa'} — só essa pessoa ou um administrador pode mudar o status.`;
  }
  return null;
}
