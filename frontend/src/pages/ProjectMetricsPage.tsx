import { Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProjectMetrics } from '../api/metrics';
import { queryKeys } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { Spinner } from '../components/common/Spinner';
import { EmptyState } from '../components/common/EmptyState';
import { Avatar } from '../components/common/Avatar';
import { StatusCategory } from '../types';

const CATEGORY_LABELS: Record<StatusCategory, string> = {
  BACKLOG: 'Backlog',
  UNSTARTED: 'A fazer',
  STARTED: 'Em andamento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

const CATEGORY_COLORS: Record<StatusCategory, string> = {
  BACKLOG: 'bg-slate-500',
  UNSTARTED: 'bg-sky-500',
  STARTED: 'bg-amber-500',
  COMPLETED: 'bg-emerald-500',
  CANCELLED: 'bg-red-500',
};

function formatHours(hours: number | null): string {
  if (hours === null) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} dias`;
}

function formatDays(days: number): string {
  if (days < 1) return `${Math.round(days * 24)} h`;
  return `${days.toFixed(1)} dias`;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-100">{value}</p>
    </div>
  );
}

export function ProjectMetricsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const { data: metrics, isLoading } = useQuery({
    queryKey: queryKeys.projectMetrics(projectId!),
    queryFn: () => getProjectMetrics(projectId!),
    enabled: !!projectId,
  });

  if (user && user.globalRole !== 'ADMIN' && user.globalRole !== 'SENIOR') {
    return <Navigate to={`/projects/${projectId}/board`} replace />;
  }

  if (isLoading) return <Spinner />;
  if (!metrics) return null;

  const categories = Object.keys(CATEGORY_LABELS) as StatusCategory[];
  const maxCategoryCount = Math.max(1, ...categories.map((c) => metrics.byCategory[c]));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total de itens" value={String(metrics.totalItems)} />
        <StatCard label="Concluídos" value={String(metrics.byCategory.COMPLETED)} />
        <StatCard label="Cancelados" value={String(metrics.byCategory.CANCELLED)} />
        <StatCard label="Tempo médio até concluir" value={formatHours(metrics.avgCompletionHours)} />
        <StatCard label="Duração do projeto" value={formatDays(metrics.projectDurationDays)} />
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-4 text-sm font-semibold text-slate-200">Itens por status</h2>
        <div className="flex flex-col gap-2">
          {categories.map((category) => {
            const count = metrics.byCategory[category];
            return (
              <div key={category} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-xs text-slate-400">{CATEGORY_LABELS[category]}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full ${CATEGORY_COLORS[category]}`}
                    style={{ width: `${(count / maxCategoryCount) * 100}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-xs text-slate-300">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-4 text-sm font-semibold text-slate-200">Por responsável</h2>
        {metrics.perUser.length === 0 ? (
          <EmptyState title="Nenhum item atribuído ainda" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs text-slate-400">
                <th className="pb-2 font-normal">Usuário</th>
                <th className="pb-2 font-normal text-right">Atribuídos</th>
                <th className="pb-2 font-normal text-right">Concluídos</th>
                <th className="pb-2 font-normal text-right">Cancelados</th>
              </tr>
            </thead>
            <tbody>
              {metrics.perUser.map((stat) => (
                <tr key={stat.userId} className="border-b border-slate-800/60 last:border-0">
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <Avatar name={stat.fullName} src={stat.avatarUrl} size={22} />
                      <span className="text-slate-200">{stat.fullName}</span>
                    </div>
                  </td>
                  <td className="py-2 text-right text-slate-300">{stat.assigned}</td>
                  <td className="py-2 text-right text-emerald-400">{stat.completed}</td>
                  <td className="py-2 text-right text-red-400">{stat.cancelled}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
