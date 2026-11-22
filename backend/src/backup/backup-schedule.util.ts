/**
 * Cálculo de horário do backup agendado. O horário configurado ("HH:MM") vale no fuso
 * `BACKUP_TIMEZONE` (padrão America/Sao_Paulo), não no UTC do container.
 */

export const RUN_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Se o backend estava parado no horário, ainda roda até este tempo depois; mais que isso espera o dia seguinte. */
export const CATCH_UP_MS = 6 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

export function backupTimezone(): string {
  return process.env.BACKUP_TIMEZONE || 'America/Sao_Paulo';
}

interface ScheduleState {
  enabled: boolean;
  runTime: string;
  runRequestedAt: Date | null;
  lastAttemptAt: Date | null;
}

function zonedParts(date: Date, zone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

/** Horário de hoje (no fuso do backup) como instante UTC. */
export function scheduledAt(runTime: string, now: Date, zone = backupTimezone()): Date {
  const [hour, minute] = runTime.split(':').map(Number);
  const { year, month, day } = zonedParts(now, zone);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const local = zonedParts(new Date(guess), zone);
  const offset = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second) - guess;
  return new Date(guess - offset);
}

export function nextRunAt(state: ScheduleState, now: Date, zone = backupTimezone()): Date | null {
  if (!state.enabled) return null;
  const today = scheduledAt(state.runTime, now, zone);
  const doneToday = state.lastAttemptAt !== null && state.lastAttemptAt >= today;
  if (doneToday || now.getTime() >= today.getTime() + CATCH_UP_MS) {
    return scheduledAt(state.runTime, new Date(now.getTime() + DAY_MS), zone);
  }
  return today;
}

export function isDue(state: ScheduleState, now: Date, zone = backupTimezone()): boolean {
  if (state.runRequestedAt !== null) return true;
  if (!state.enabled) return false;
  const runAt = scheduledAt(state.runTime, now, zone);
  if (now < runAt || now.getTime() >= runAt.getTime() + CATCH_UP_MS) return false;
  return state.lastAttemptAt === null || state.lastAttemptAt < runAt;
}

/** "AAAAMMDD-HHMMSS" no fuso do backup, usado no nome do arquivo. */
export function fileStamp(now: Date, zone = backupTimezone()): string {
  const p = zonedParts(now, zone);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${p.year}${pad(p.month)}${pad(p.day)}-${pad(p.hour)}${pad(p.minute)}${pad(p.second)}`;
}

/**
 * "Agora" no mesmo formato dos campos literais (`dueDate`/`reminderAt`): o relógio de parede do fuso
 * gravado como se fosse UTC. Comparar esses campos com o `new Date()` real adiantaria tudo pelo offset.
 * shortcut: usa um fuso só para o app inteiro (BACKUP_TIMEZONE); trocar pelo `User.timezone` de cada
 * responsável se houver equipes em fusos diferentes.
 */
export function literalNow(now: Date, zone = backupTimezone()): Date {
  const p = zonedParts(now, zone);
  return new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second));
}

/** Meia-noite (literal) de hoje no fuso do app — mesma régua de "atrasada" do `isOverdue` do frontend. */
export function startOfLiteralToday(now: Date, zone = backupTimezone()): Date {
  const local = literalNow(now, zone);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
}
