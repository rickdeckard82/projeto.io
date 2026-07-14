import { GlobalRole } from '../types';

export const canCreateProject = (role: GlobalRole) => role === 'ADMIN';
export const canManageProjectSettings = (role: GlobalRole) => role === 'ADMIN';
export const canManageUsers = (role: GlobalRole) => role === 'ADMIN';
export const canEditItem = (role: GlobalRole) => role === 'ADMIN' || role === 'MEMBER';
export const canEditDocument = (role: GlobalRole) => role === 'ADMIN' || role === 'MEMBER';
export const isReadOnly = (role: GlobalRole) => role === 'VIEWER';
