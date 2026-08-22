/**
 * Formata uma data ISO (`startDate`/`dueDate`/`reminderAt` — dia do calendário, com hora opcional
 * escolhida pelo usuário, meia-noite quando omitida) como dd/mm/aaaa. Rearranja os dígitos direto
 * da string ISO em vez de passar por `Date`/`toLocaleDateString`: o valor é gravado tal como
 * digitado (sem conversão de fuso — ver {@link combineDateTime}), então formatar via locale só
 * introduziria erro ao reinterpretar esse literal como fuso do navegador.
 * @param iso - data/hora no formato ISO 8601 (usa só os 10 primeiros caracteres, `aaaa-mm-dd`)
 * @returns data no formato `dd/mm/aaaa`
 */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Extrai a hora (`HH:mm`) de uma data ISO gravada por {@link combineDateTime}, para preencher um
 * `<input type="time">`. Meia-noite (`00:00`) quando o usuário nunca escolheu hora.
 * @param iso - data/hora no formato ISO 8601
 */
export function timeInputValue(iso: string): string {
  return iso.slice(11, 16);
}

/**
 * Combina uma data (`aaaa-mm-dd`, de um `<input type="date">`) e uma hora opcional (`HH:mm`, de um
 * `<input type="time">`) num ISO literal em UTC, sem nenhuma conversão de fuso: o valor digitado é
 * gravado exatamente como está, igual à convenção já usada para `startDate`/`dueDate` sem hora —
 * ver comentário de `WorkItem.startDate` em `schema.prisma`. Hora vazia vira meia-noite.
 * @param date - `aaaa-mm-dd`
 * @param time - `HH:mm`, opcional
 */
export function combineDateTime(date: string, time: string): string {
  return `${date}T${time || '00:00'}:00.000Z`;
}

/**
 * Verifica se uma data (`dueDate`, formato dia-do-calendário) já venceu, comparando a parte
 * `aaaa-mm-dd` da string ISO com a data local de hoje — mesma lógica de {@link formatDate},
 * sem passar por `Date`/`toLocaleDateString` para evitar o mesmo bug de fuso horário.
 * @param iso - data no formato ISO 8601 (usa só os 10 primeiros caracteres, `aaaa-mm-dd`)
 * @returns `true` se a data já passou (antes de hoje)
 */
export function isOverdue(iso: string): boolean {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return iso.slice(0, 10) < todayStr;
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
