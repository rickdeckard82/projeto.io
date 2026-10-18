import { Priority, StatusCategory } from '../types';

/** Cores da marca (gradiente do logo em `frontend/src/assets/projeto-io-icon.svg`) e neutros da UI. */
export const colors = {
  primary: '#4C3ED9',
  primaryLight: '#7C6CF6',
  background: '#F7F7FB',
  surface: '#FFFFFF',
  border: '#E4E4EE',
  text: '#1F1F2E',
  textMuted: '#6B6B80',
  danger: '#D93E3E',
};

export const categoryColors: Record<StatusCategory, string> = {
  BACKLOG: '#9CA3AF',
  UNSTARTED: '#6B7280',
  STARTED: '#F59E0B',
  COMPLETED: '#10B981',
  CANCELLED: '#EF4444',
};

export const priorityLabels: Record<Priority, string> = {
  NONE: 'Sem prioridade',
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

export const priorityColors: Record<Priority, string> = {
  NONE: '#9CA3AF',
  LOW: '#3B82F6',
  MEDIUM: '#F59E0B',
  HIGH: '#F97316',
  URGENT: '#EF4444',
};

/** dd/mm/aaaa a partir da parte de data do ISO, sem conversão de fuso — igual ao `formatDate` do web. */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}
