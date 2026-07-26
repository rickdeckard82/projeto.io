import { RecurrenceUnit } from '../../types';

type Preset = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

const PRESET_OPTIONS: { value: Preset; label: string }[] = [
  { value: 'none', label: 'Não repete' },
  { value: 'daily', label: 'Diariamente' },
  { value: 'weekly', label: 'Semanalmente' },
  { value: 'monthly', label: 'Mensalmente' },
  { value: 'custom', label: 'Personalizada (a cada N dias)' },
];

/** Deriva o preset selecionado a partir de unit/interval — "personalizada" é qualquer combinação que não bata com um dos presets fixos (ex.: DAY com interval != 1). */
function presetOf(unit: RecurrenceUnit | null, interval: number | null): Preset {
  if (!unit) return 'none';
  if (unit === 'WEEK' && interval === 1) return 'weekly';
  if (unit === 'MONTH' && interval === 1) return 'monthly';
  if (unit === 'DAY' && interval === 1) return 'daily';
  return 'custom';
}

/**
 * Select de recorrência de um item: "Não repete" ou uma das cadências fixas (diária/semanal/
 * mensal), mais "Personalizada" que expõe um campo numérico para "a cada N dias" — não existe uma
 * unidade "custom" no backend, é só `DAY` com `interval` diferente de 1 (ver `RecurrenceUnit` em
 * `types/index.ts`).
 */
export function RecurrenceSelect({
  unit,
  interval,
  onChange,
  disabled,
}: {
  unit: RecurrenceUnit | null;
  interval: number | null;
  onChange: (unit: RecurrenceUnit | null, interval: number | null) => void;
  disabled?: boolean;
}) {
  const preset = presetOf(unit, interval);

  const handlePresetChange = (next: Preset) => {
    if (next === 'none') return onChange(null, null);
    if (next === 'daily') return onChange('DAY', 1);
    if (next === 'weekly') return onChange('WEEK', 1);
    if (next === 'monthly') return onChange('MONTH', 1);
    onChange('DAY', interval && interval > 1 ? interval : 2);
  };

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={preset}
        disabled={disabled}
        onChange={(e) => handlePresetChange(e.target.value as Preset)}
        className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 disabled:opacity-50"
      >
        {PRESET_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {preset === 'custom' && (
        <input
          type="number"
          min={1}
          value={interval ?? 2}
          disabled={disabled}
          onChange={(e) => onChange('DAY', Math.max(1, Number(e.target.value) || 1))}
          className="w-14 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 disabled:opacity-50"
        />
      )}
    </div>
  );
}
