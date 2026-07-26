import { CHANGELOG } from '../lib/changelog';
import { formatDate } from '../lib/dateFormat';

export function ChangelogPage() {
  const entries = [...CHANGELOG].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-lg font-semibold text-slate-100">Changelog</h1>
      <p className="mb-6 text-sm text-slate-500">Histórico de mudanças do Projeto.io.</p>

      <div className="flex flex-col gap-6">
        {entries.map((entry) => (
          <div key={entry.version} className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <div className="mb-3 flex items-baseline gap-2">
              <h2 className="text-sm font-semibold text-indigo-400">Versão {entry.version}</h2>
              <span className="text-xs text-slate-500">{formatDate(entry.date)}</span>
            </div>
            <ul className="flex flex-col gap-1.5">
              {entry.changes.map((change, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-300">
                  <span className="shrink-0 text-slate-600">•</span>
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
