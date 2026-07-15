import { GlobalRole } from '../types';

/** Libera a UI de criação de projetos apenas para administradores (checagem só de conveniência — a garantia real é no backend). */
export const canCreateProject = (role: GlobalRole) => role === 'ADMIN';
/** Libera a UI de configurações do projeto (settings) apenas para administradores (checagem só de conveniência — a garantia real é no backend). */
export const canManageProjectSettings = (role: GlobalRole) => role === 'ADMIN';
/** Libera a UI de gerenciamento de usuários apenas para administradores (checagem só de conveniência — a garantia real é no backend). */
export const canManageUsers = (role: GlobalRole) => role === 'ADMIN';
/** Libera a UI de edição de itens de trabalho para administradores e membros, mas não para visualizadores (checagem só de conveniência — a garantia real é no backend). */
export const canEditItem = (role: GlobalRole) => role === 'ADMIN' || role === 'MEMBER';
/** Libera a UI de edição de documentos para administradores e membros, mas não para visualizadores (checagem só de conveniência — a garantia real é no backend). */
export const canEditDocument = (role: GlobalRole) => role === 'ADMIN' || role === 'MEMBER';
/** Indica se o papel do usuário é somente leitura (VIEWER), usado para esconder/desabilitar ações de escrita na UI (checagem só de conveniência — a garantia real é no backend). */
export const isReadOnly = (role: GlobalRole) => role === 'VIEWER';
