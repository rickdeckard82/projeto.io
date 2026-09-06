import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AuditLogEntry, AUDIT_ACTION_LABELS, listAuditLogs } from '../api/audit';
import { useAuth } from '../auth/AuthContext';
import { formatDateTime } from '../lib/dateFormat';

const PAGE_SIZE = 50;

function actionLabel(action: string) {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

function metaSummary(entry: AuditLogEntry): string | null {
  if (!entry.metadata || Object.keys(entry.metadata).length === 0) return null;
  return Object.entries(entry.metadata)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(' · ');
}

export function AuditLogPage() {
  const { user } = useAuth();
  const [action, setAction] = useState('');
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (reset: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const page = await listAuditLogs({
          limit: PAGE_SIZE,
          action: action || undefined,
          cursor: reset ? undefined : cursor ?? undefined,
        });
        setItems((prev) => (reset ? page.items : [...prev, ...page.items]));
        setCursor(page.nextCursor);
        setHasMore(!!page.nextCursor);
      } catch {
        setError('Não foi possível carregar a trilha de auditoria.');
      } finally {
        setLoading(false);
      }
    },
    [action, cursor],
  );

  // Recarrega do zero quando o filtro de ação muda.
  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action]);

  // Página de administração — a regra de verdade é o `@Roles(ADMIN)` no backend; isto só evita
  // renderizar uma tela que só daria 403.
  if (user && user.globalRole !== 'ADMIN') {
    return <Navigate to="/settings/profile" replace />;
  }

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-slate-100">Auditoria</h1>
      <p className="mb-4 text-xs text-slate-400">
        Eventos de segurança e administrativos: quem fez, quando, de onde e o quê. Somente leitura.
      </p>

      <div className="mb-4">
        <label className="mb-1 block text-xs text-slate-400">Filtrar por ação</label>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        >
          <option value="">Todas</option>
          {Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Quando</th>
              <th className="px-3 py-2">Ação</th>
              <th className="px-3 py-2">Ator</th>
              <th className="px-3 py-2">Alvo</th>
              <th className="px-3 py-2">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {items.map((entry) => {
              const meta = metaSummary(entry);
              return (
                <tr key={entry.id} className="align-top text-slate-300">
                  <td className="whitespace-nowrap px-3 py-2 text-slate-400">
                    {formatDateTime(entry.createdAt, user?.timezone)}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-slate-100">{actionLabel(entry.action)}</span>
                    {meta && <div className="mt-0.5 text-xs text-slate-500">{meta}</div>}
                  </td>
                  <td className="px-3 py-2">{entry.actorLabel ?? <span className="text-slate-600">—</span>}</td>
                  <td className="px-3 py-2 text-slate-400">
                    {entry.targetType ? `${entry.targetType}${entry.targetId ? ` · ${entry.targetId.slice(0, 8)}` : ''}` : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-400">{entry.ip ?? '—'}</td>
                </tr>
              );
            })}
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                  Nenhum evento registrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-3">
        {hasMore && (
          <button
            type="button"
            onClick={() => load(false)}
            disabled={loading}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-900 disabled:opacity-50"
          >
            {loading ? 'Carregando...' : 'Carregar mais'}
          </button>
        )}
        {loading && items.length === 0 && <span className="text-sm text-slate-500">Carregando...</span>}
      </div>
    </div>
  );
}
