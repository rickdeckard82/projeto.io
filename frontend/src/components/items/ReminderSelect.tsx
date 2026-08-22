import { useEffect, useState } from 'react';
import { combineDateTime, timeInputValue } from '../../lib/dateFormat';

type Mode = 'none' | 'offset' | 'absolute';

const OFFSET_PRESETS: { value: number; label: string }[] = [
  { value: 10, label: '10 min antes' },
  { value: 30, label: '30 min antes' },
  { value: 60, label: '1 hora antes' },
  { value: 180, label: '3 horas antes' },
  { value: 1440, label: '1 dia antes' },
  { value: 2880, label: '2 dias antes' },
  { value: 10080, label: '1 semana antes' },
];

function modeOf(reminderAt: string | null, reminderOffsetMinutes: number | null): Mode {
  if (reminderOffsetMinutes != null) return 'offset';
  if (reminderAt) return 'absolute';
  return 'none';
}

/**
 * Lembrete customizado de um item: um único seletor com dois modos — "antes do vencimento"
 * (relativo, guardado como `reminderOffsetMinutes` e recalculado no backend sempre que o
 * vencimento muda) ou "data e hora exatas" (`reminderAt` absoluto). O modo relativo exige que o
 * item já tenha vencimento definido.
 */
export function ReminderSelect({
  reminderAt,
  reminderOffsetMinutes,
  dueDate,
  onChange,
  disabled,
}: {
  reminderAt: string | null;
  reminderOffsetMinutes: number | null;
  dueDate: string | null;
  onChange: (reminderAt: string | null, reminderOffsetMinutes: number | null) => void;
  disabled?: boolean;
}) {
  const mode = modeOf(reminderAt, reminderOffsetMinutes);
  const [absoluteDate, setAbsoluteDate] = useState(reminderAt?.slice(0, 10) || '');
  const [absoluteTime, setAbsoluteTime] = useState(reminderAt ? timeInputValue(reminderAt) : '');

  useEffect(() => {
    setAbsoluteDate(reminderAt?.slice(0, 10) || '');
    setAbsoluteTime(reminderAt ? timeInputValue(reminderAt) : '');
  }, [reminderAt]);

  const handleModeChange = (next: Mode) => {
    if (next === 'none') return onChange(null, null);
    if (next === 'offset') return onChange(null, reminderOffsetMinutes ?? 60);
    const date = absoluteDate || new Date().toISOString().slice(0, 10);
    const time = absoluteTime || '09:00';
    setAbsoluteDate(date);
    setAbsoluteTime(time);
    onChange(combineDateTime(date, time), null);
  };

  const saveAbsolute = (date: string, time: string) => {
    if (!date) return onChange(null, null);
    onChange(combineDateTime(date, time), null);
  };

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={mode}
        disabled={disabled}
        onChange={(e) => handleModeChange(e.target.value as Mode)}
        className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 disabled:opacity-50"
      >
        <option value="none">Sem lembrete</option>
        <option value="offset" disabled={!dueDate}>
          Antes do vencimento
        </option>
        <option value="absolute">Data e hora exatas</option>
      </select>

      {mode === 'offset' && (
        <select
          value={reminderOffsetMinutes ?? 60}
          disabled={disabled}
          onChange={(e) => onChange(null, Number(e.target.value))}
          className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 disabled:opacity-50"
        >
          {OFFSET_PRESETS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {mode === 'absolute' && (
        <>
          <input
            type="date"
            disabled={disabled}
            value={absoluteDate}
            onChange={(e) => setAbsoluteDate(e.target.value)}
            onBlur={() => saveAbsolute(absoluteDate, absoluteTime)}
            className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 disabled:opacity-50"
          />
          <input
            type="time"
            disabled={disabled}
            value={absoluteTime}
            onChange={(e) => setAbsoluteTime(e.target.value)}
            onBlur={() => saveAbsolute(absoluteDate, absoluteTime)}
            className="w-20 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 disabled:opacity-50"
          />
        </>
      )}
    </div>
  );
}
