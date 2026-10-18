import { ItemActivity, Priority } from '../types';
import { priorityLabels } from './theme';

/** "há 5 min", "há 3h"... — mesma régua de `frontend/src/lib/relativeTime.ts`. */
export function relativeTime(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'agora mesmo';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days}d`;
  const months = Math.floor(days / 30);
  return `há ${months} ${months === 1 ? 'mês' : 'meses'}`;
}

/** Texto de cada evento do histórico — mesmo de `describeActivity` em `ActivityFeed.tsx` do web. */
export function describeActivity(activity: ItemActivity): string {
  const meta = activity.metadata || {};
  switch (activity.type) {
    case 'CREATED':
      return 'criou o item';
    case 'TITLE_CHANGED':
      return `alterou o título para "${meta.to}"`;
    case 'DESCRIPTION_CHANGED':
      return 'atualizou a descrição';
    case 'STATUS_CHANGED':
      return `moveu de "${meta.from}" para "${meta.to}"`;
    case 'PRIORITY_CHANGED':
      return `alterou a prioridade de ${priorityLabels[(meta.from || 'NONE') as Priority]} para ${
        priorityLabels[(meta.to || 'NONE') as Priority]
      }`;
    case 'LABEL_ADDED':
      return `adicionou a etiqueta "${meta.name}"`;
    case 'LABEL_REMOVED':
      return `removeu a etiqueta "${meta.name}"`;
    case 'ASSIGNEE_ADDED':
      return `adicionou ${meta.userName} como responsável`;
    case 'ASSIGNEE_REMOVED':
      return `removeu ${meta.userName} dos responsáveis`;
    case 'COMMENT':
      return 'comentou';
    case 'RECURRENCE_GENERATED':
      return `gerou a próxima ocorrência: "${meta.newItemTitle}"`;
    default:
      return '';
  }
}

/** Tempo "em andamento" acumulado + o intervalo ainda em curso, como "3h 20min". */
export function formatInProgress(seconds: number, since: string | null | undefined): string | null {
  const total = seconds + (since ? Math.max(0, (Date.now() - new Date(since).getTime()) / 1000) : 0);
  if (total < 60) return null;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}
