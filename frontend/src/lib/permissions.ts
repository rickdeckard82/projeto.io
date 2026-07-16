import { GlobalRole } from '../types';

/** Libera a UI de edição de itens de trabalho para administradores e membros, mas não para visualizadores (checagem só de conveniência — a garantia real é no backend). */
export const canEditItem = (role: GlobalRole) => role === 'ADMIN' || role === 'MEMBER';
/** Libera a UI de edição de documentos para administradores e membros, mas não para visualizadores (checagem só de conveniência — a garantia real é no backend). */
export const canEditDocument = (role: GlobalRole) => role === 'ADMIN' || role === 'MEMBER';
