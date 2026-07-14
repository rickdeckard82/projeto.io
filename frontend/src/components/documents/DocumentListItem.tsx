import { Link } from 'react-router-dom';
import { ProjectDocument } from '../../types';

export function DocumentListItem({ projectId, document }: { projectId: string; document: ProjectDocument }) {
  return (
    <Link
      to={`/projects/${projectId}/documents/${document.id}`}
      className="block rounded-md border border-slate-800 bg-slate-900 px-4 py-3 hover:border-indigo-600"
    >
      <p className="text-sm font-medium text-slate-100">{document.title}</p>
      <p className="mt-1 text-xs text-slate-500">
        Atualizado em {new Date(document.updatedAt).toLocaleString('pt-BR')}
      </p>
    </Link>
  );
}
