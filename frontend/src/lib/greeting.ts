/** Extrai a hora (0-23) de `date` no fuso informado — `date.getHours()` sempre usaria o fuso do próprio navegador, ignorando a preferência do usuário. */
function hourInTimezone(date: Date, timezone?: string): number {
  const formatted = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', hourCycle: 'h23' }).format(date);
  return Number(formatted);
}

/**
 * Escolhe a saudação apropriada (Bom dia / Boa tarde / Boa noite) com base na hora do dia no
 * fuso do usuário (`User.timezone`, editável em `/settings/profile`), usada no cabeçalho da home.
 * @param date - momento de referência (padrão: agora)
 * @param timezone - fuso IANA do usuário; `undefined` cai no fuso do navegador
 * @returns saudação em português
 */
export function getGreeting(date: Date = new Date(), timezone?: string): string {
  const hour = hourInTimezone(date, timezone);
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

/**
 * Formata uma data por extenso em pt-BR (dia da semana, dia, mês e hora:minuto) no fuso do
 * usuário, usada como subtítulo da saudação na home.
 * @param date - momento de referência (padrão: agora)
 * @param timezone - fuso IANA do usuário; `undefined` cai no fuso do navegador
 * @returns data formatada por extenso, com a hora atual
 */
export function formatLongDate(date: Date = new Date(), timezone?: string): string {
  const datePart = date.toLocaleDateString('pt-BR', {
    timeZone: timezone,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
  const timePart = date.toLocaleTimeString('pt-BR', { timeZone: timezone, hour: '2-digit', minute: '2-digit' });
  return `${datePart} · ${timePart}`;
}
