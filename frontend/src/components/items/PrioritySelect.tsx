import { Priority } from '../../types';

const OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'NONE', label: 'Nenhuma', color: '#64748b' },
  { value: 'LOW', label: 'Baixa', color: '#38bdf8' },
  { value: 'MEDIUM', label: 'Média', color: '#facc15' },
  { value: 'HIGH', label: 'Alta', color: '#fb923c' },
  { value: 'URGENT', label: 'Urgente', color: '#ef4444' },
];

export function PrioritySelect({
  value,
  onChange,
  disabled,
}: {
  value: Priority;
  onChange: (value: Priority) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as Priority)}
      className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 disabled:opacity-50"
    >
      {OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function priorityColor(priority: Priority): string {
  return OPTIONS.find((o) => o.value === priority)?.color || '#64748b';
}

export function priorityLabel(priority: Priority): string {
  return OPTIONS.find((o) => o.value === priority)?.label || priority;
}
