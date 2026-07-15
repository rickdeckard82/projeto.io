/**
 * Formata uma data ISO como tempo relativo até agora (ex.: "agora mesmo", "há 5 min", "há 3h", "há 2d", "há 1 mês"), escolhendo a unidade pelo maior bucket que caiba na diferença (minutos < 60, horas < 24, dias < 30, senão meses).
 * @param iso - data/hora no formato ISO 8601
 * @returns texto em português já formatado para exibição
 */
export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return 'agora mesmo';
  if (minutes < 60) return `há ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days}d`;

  const months = Math.floor(days / 30);
  return `há ${months} ${months === 1 ? 'mês' : 'meses'}`;
}
