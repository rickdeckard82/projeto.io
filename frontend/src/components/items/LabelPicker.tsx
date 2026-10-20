import { useQuery } from '@tanstack/react-query';
import { listLabels } from '../../api/labels';
import { queryKeys } from '../../api/queryKeys';
import { Badge } from '../common/Badge';

export function LabelPicker({
  selectedLabelIds,
  onChange,
  disabled,
}: {
  selectedLabelIds: string[];
  onChange: (labelIds: string[]) => void;
  disabled?: boolean;
}) {
  const { data: labels } = useQuery({
    queryKey: queryKeys.labels,
    queryFn: listLabels,
  });

  const toggle = (labelId: string) => {
    if (selectedLabelIds.includes(labelId)) {
      onChange(selectedLabelIds.filter((id) => id !== labelId));
    } else {
      onChange([...selectedLabelIds, labelId]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {labels?.map((label) => (
        <button
          type="button"
          key={label.id}
          disabled={disabled}
          onClick={() => toggle(label.id)}
          className={`transition-opacity ${selectedLabelIds.includes(label.id) ? 'opacity-100' : 'opacity-40'}`}
        >
          <Badge color={label.color}>{label.name}</Badge>
        </button>
      ))}
      {labels?.length === 0 && <p className="text-xs text-slate-500">Nenhuma etiqueta criada.</p>}
    </div>
  );
}
