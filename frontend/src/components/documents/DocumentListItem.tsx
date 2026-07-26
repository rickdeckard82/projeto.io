import { Link } from 'react-router-dom';
import { ProjectDocument } from '../../types';
import { useAuth } from '../../auth/AuthContext';
import { formatDateTime } from '../../lib/dateFormat';

export function DocumentListItem({ projectId, document }: { projectId: string; document: ProjectDocument }) {
  const { user } = useAuth();
  return (
    <Link
      to={`/projects/${projectId}/documents/${document.id}`}
      className="block rounded-md border border-slate-800 bg-slate-900 px-4 py-3 hover:border-indigo-600"
    >
      <p className="text-sm font-medium text-slate-100">{document.title}</p>
      <p className="mt-1 text-xs text-slate-500">
        Atualizado em {formatDateTime(document.updatedAt, user?.timezone)}
      </p>
    </Link>
  );
}
