import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Repeat } from 'lucide-react';
import { formatDate } from '../../lib/dateFormat';
import { listUserDirectory } from '../../api/users';
import { listLabels } from '../../api/labels';
import { queryKeys } from '../../api/queryKeys';
import { useWorkItems } from '../../hooks/useWorkItems';
import { Spinner } from '../common/Spinner';
import { EmptyState } from '../common/EmptyState';
import { Badge } from '../common/Badge';
import { Avatar } from '../common/Avatar';
import { priorityColor, priorityLabel } from './PrioritySelect';
import { ItemDetailModal } from './ItemDetailModal';

export function ItemListTable({ projectId, moduleId }: { projectId: string; moduleId?: string }) {
  const [assigneeId, setAssigneeId] = useState('');
  const [labelId, setLabelId] = useState('');
  const [openItemId, setOpenItemId] = useState<string | null>(null);

  const { data: users } = useQuery({ queryKey: queryKeys.userDirectory, queryFn: listUserDirectory });
  const { data: labels } = useQuery({
    queryKey: queryKeys.labels,
    queryFn: listLabels,
  });

  const { items, isLoading } = useWorkItems(projectId, {
    parentId: 'null',
    assigneeId: assigneeId || undefined,
    labelId: labelId || undefined,
    moduleId,
  });

  return (
    <div>
      <div className="mb-4 flex gap-3">
        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
        >
          <option value="">Todos os responsáveis</option>
          {users?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.fullName}
            </option>
          ))}
        </select>
        <select
          value={labelId}
          onChange={(e) => setLabelId(e.target.value)}
          className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
        >
          <option value="">Todas as etiquetas</option>
          {labels?.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <Spinner />}

      {!isLoading && items.length === 0 && <EmptyState title="Nenhum item encontrado" />}

      {!isLoading && items.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-xs text-slate-500">
              <th className="py-2 font-medium">Título</th>
              <th className="font-medium">Status</th>
              <th className="font-medium">Prioridade</th>
              <th className="font-medium">Etiquetas</th>
              <th className="font-medium">Responsáveis</th>
              <th className="font-medium">Vencimento</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                onClick={() => setOpenItemId(item.id)}
                className="cursor-pointer border-b border-slate-900 hover:bg-slate-900"
              >
                <td className="py-2 text-slate-100">
                  <span className="flex items-center gap-1.5">
                    {item.recurrenceUnit && (
                      <span title="Tarefa recorrente" className="shrink-0 text-slate-500">
                        <Repeat size={12} />
                      </span>
                    )}
                    {item.title}
                  </span>
                </td>
                <td className="text-slate-400">{item.status?.name}</td>
                <td>
                  {item.priority !== 'NONE' && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium text-slate-950"
                      style={{ backgroundColor: priorityColor(item.priority) }}
                    >
                      {priorityLabel(item.priority)}
                    </span>
                  )}
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {item.labels.map((l) => (
                      <Badge key={l.label.id} color={l.label.color}>
                        {l.label.name}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td>
                  <div className="flex -space-x-1">
                    {item.assignees.map((a) => (
                      <Avatar key={a.user.id} name={a.user.fullName} src={a.user.avatarUrl} />
                    ))}
                  </div>
                </td>
                <td className="text-slate-400">{item.dueDate ? formatDate(item.dueDate) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {openItemId && (
        <ItemDetailModal
          projectId={projectId}
          itemId={openItemId}
          onClose={() => setOpenItemId(null)}
          onOpenItem={setOpenItemId}
        />
      )}
    </div>
  );
}
