import { Priority } from '../generated/prisma/client.js';

const PRIORITY_LABELS: Record<Priority, string> = {
  NONE: 'Nenhuma',
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

/** Rótulo em português da prioridade, mesmo mapeamento de `PrioritySelect.tsx` no frontend. */
export function priorityLabel(priority: Priority): string {
  return PRIORITY_LABELS[priority];
}

/**
 * Formata um `Date` de `dueDate`/`reminderAt` como `dd/mm/aaaa` (e `HH:mm` se houver hora além de
 * meia-noite). Usa os getters UTC, não os locais: esses campos são gravados como o literal
 * digitado pelo usuário (sem conversão de fuso — ver comentário de `WorkItem.startDate` em
 * `schema.prisma`), então ler via `getUTC*` reproduz exatamente o que a pessoa escolheu.
 */
export function formatDateTimeLiteral(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const time = hours === 0 && minutes === 0 ? '' : ` ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return `${day}/${month}/${year}${time}`;
}

/** Descreve um intervalo em minutos como "N min/hora(s)/dia(s)/semana(s) antes", igual aos presets de `ReminderSelect.tsx` no frontend. */
export function formatOffsetMinutes(minutes: number): string {
  if (minutes % 10080 === 0) {
    const weeks = minutes / 10080;
    return `${weeks} semana${weeks > 1 ? 's' : ''} antes`;
  }
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `${days} dia${days > 1 ? 's' : ''} antes`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hora${hours > 1 ? 's' : ''} antes`;
  }
  return `${minutes} min antes`;
}
