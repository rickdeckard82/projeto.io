import { Priority, StatusCategory } from '../types';

/**
 * Paleta do app, espelhando as classes Tailwind do frontend web (tema escuro `slate` + destaque
 * `indigo` — ver `frontend/src/styles/index.css` e `components/common/Button.tsx`). Os nomes dos
 * comentários são as classes equivalentes, para facilitar manter os dois lados iguais.
 */
export const colors = {
  background: '#020617', // slate-950 (body)
  surface: '#0f172a', // slate-900 (cards, formulários)
  surfaceRaised: '#1e293b', // slate-800 (botão secundário, badge)
  border: '#1e293b', // slate-800
  borderStrong: '#334155', // slate-700 (inputs)
  text: '#f1f5f9', // slate-100
  textSecondary: '#cbd5e1', // slate-300
  textMuted: '#94a3b8', // slate-400
  textFaint: '#64748b', // slate-500
  primary: '#4f46e5', // indigo-600 (botão primário)
  primaryPressed: '#6366f1', // indigo-500
  accent: '#818cf8', // indigo-400 (links)
  wave1: '#818cf8', // indigo-400 — ondas, ver `components/Waves.tsx`
  wave2: '#a5b4fc', // indigo-300
  wave3: '#c7d2fe', // indigo-200
  danger: '#f87171', // red-400 (mensagens de erro)
  dangerSolid: '#dc2626', // red-600
};

/** Cor por categoria de status — mesma do brilho do card do kanban web (`STATUS_GLOW` em `KanbanCard.tsx`). */
export const categoryColors: Record<StatusCategory, string> = {
  BACKLOG: '#64748b',
  UNSTARTED: '#38bdf8',
  STARTED: '#facc15',
  COMPLETED: '#4ade80',
  CANCELLED: '#f87171',
};

/** Rótulos e cores de prioridade — mesmos de `PRIORITY_OPTIONS` em `frontend/src/components/items/PrioritySelect.tsx`. */
export const priorityLabels: Record<Priority, string> = {
  NONE: 'Nenhuma',
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

export const priorityColors: Record<Priority, string> = {
  NONE: '#64748b',
  LOW: '#38bdf8',
  MEDIUM: '#facc15',
  HIGH: '#fb923c',
  URGENT: '#ef4444',
};

/** dd/mm/aaaa a partir da parte de data do ISO, sem conversão de fuso — igual ao `formatDate` do web. */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}
