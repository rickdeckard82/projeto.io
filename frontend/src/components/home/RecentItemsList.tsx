import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getRecentItems } from '../../api/workItems';
import { queryKeys } from '../../api/queryKeys';
import { Spinner } from '../common/Spinner';
import { EmptyState } from '../common/EmptyState';
import { Avatar } from '../common/Avatar';
import { relativeTime } from '../../lib/relativeTime';

export function RecentItemsList() {
  const { data: items, isLoading } = useQuery({
    queryKey: queryKeys.recentItems,
    queryFn: () => getRecentItems(10),
  });

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-slate-200">Recentes</h2>

      {isLoading && <Spinner />}

      {!isLoading && (!items || items.length === 0) && (
        <EmptyState title="Nenhuma atividade recente" description="Itens criados ou atualizados aparecerão aqui." />
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
                  <p className="text-xs text-slate-500">
                    {item.project.name} · {item.status?.name} · {relativeTime(item.updatedAt)}
                  </p>
                </div>
                {item.assignees.length > 0 && (
                  <div className="flex shrink-0 -space-x-1">
                    {item.assignees.map((a) => (
                      <Avatar key={a.user.id} name={a.user.fullName} src={a.user.avatarUrl} email={a.user.email} />
                    ))}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
