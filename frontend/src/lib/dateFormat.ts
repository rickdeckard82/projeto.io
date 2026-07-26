/**
 * Formata uma data ISO (`startDate`/`dueDate`, sempre gravada como meia-noite UTC do dia
 * escolhido — vem de `<input type="date">`, sem hora) como dd/mm/aaaa. Rearranja os dígitos
 * direto da string ISO em vez de passar por `Date`/`toLocaleDateString`: construir um `Date` e
 * formatar via locale converte para o fuso do navegador, o que pode voltar a data em um dia
 * (ex.: meia-noite UTC de 26/07 vira 25/07 às 21h em UTC-3) — não há hora de fato para preservar
 * aqui, então a conversão de fuso só introduz erro.
 * @param iso - data/hora no formato ISO 8601 (usa só os 10 primeiros caracteres, `aaaa-mm-dd`)
 * @returns data no formato `dd/mm/aaaa`
 */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Formata um timestamp real (com hora — `createdAt`/`updatedAt` e afins, ao contrário de
 * `dueDate`/`startDate`) no fuso horário do usuário (`User.timezone`, editável em
 * `/settings/profile`). Diferente de {@link formatDate}, aqui a conversão de fuso é o
 * comportamento correto: um timestamp é um instante real, não um dia do calendário.
 * @param iso - data/hora no formato ISO 8601
 * @param timezone - fuso IANA (ex.: "America/Sao_Paulo"); `undefined` cai no fuso do navegador
 * @returns data e hora formatadas em pt-BR
 */
export function formatDateTime(iso: string, timezone?: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
