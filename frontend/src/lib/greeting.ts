/**
 * Escolhe a saudação apropriada (Bom dia / Boa tarde / Boa noite) com base na hora do dia, usada no cabeçalho da home.
 * @param date - momento de referência (padrão: agora)
 * @returns saudação em português
 */
export function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

/**
 * Formata uma data por extenso em pt-BR (dia da semana, dia e mês), usada como subtítulo da saudação na home.
 * @param date - momento de referência (padrão: agora)
 * @returns data formatada por extenso
 */
export function formatLongDate(date: Date = new Date()): string {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}
