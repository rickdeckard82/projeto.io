import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getRecentItems } from '../../api/workItems';
import { queryKeys } from '../../api/queryKeys';
import { Spinner } from '../common/Spinner';
import { EmptyState } from '../common/EmptyState';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { relativeTime } from '../../lib/relativeTime';
import { formatDate, isOverdue } from '../../lib/dateFormat';
import { priorityColor, priorityLabel } from '../items/PrioritySelect';

type SortBy = 'dueDate' | 'priority';

export function RecentItemsList() {
  const [sortBy, setSortBy] = useState<SortBy>('dueDate');

  const { data: items, isLoading } = useQuery({
    queryKey: queryKeys.recentItems(sortBy),
    queryFn: () => getRecentItems(10, sortBy),
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">Recentes</h2>
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          Ordenar por
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200"
          >
            <option value="dueDate">Vencimento</option>
            <option value="priority">Prioridade</option>
          </select>
        </label>
      </div>

      {isLoading && <Spinner />}

      {!isLoading && (!items || items.length === 0) && (
        <EmptyState title="Nenhuma tarefa pendente" description="Tarefas atribuídas a você aparecerão aqui." />
      )}

      {!isLoading && items && items.length > 0 && (
        <ul className="divide-y divide-slate-800 rounded-md border border-slate-800">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={`/projects/${item.project.id}/board`}
                className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-slate-900"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-100">{item.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <span>{item.project.name} · {item.status?.name}</span>
                    {item.priority !== 'NONE' && (
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-slate-950"
                        style={{ backgroundColor: priorityColor(item.priority) }}
                      >
                        {priorityLabel(item.priority)}
                      </span>
                    )}
                    <span>{relativeTime(item.updatedAt)}</span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {item.dueDate && (
                    <Badge color={isOverdue(item.dueDate) ? '#ef4444' : '#22c55e'}>
                      Vence {formatDate(item.dueDate)}
                    </Badge>
                  )}
                  {item.assignees.length > 0 && (
                    <div className="flex -space-x-1">
                      {item.assignees.map((a) => (
                        <Avatar key={a.user.id} name={a.user.fullName} src={a.user.avatarUrl} />
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
