import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Project } from '../../types';

export function ProjectCard({ project }: { project: Project }) {
  const cover = project.coverColor || '#334155';

  return (
    <Link
      to={`/projects/${project.id}/board`}
      className="block overflow-hidden rounded-lg border border-slate-800 bg-slate-900 transition-colors hover:border-indigo-600"
    >
      <div
        className="relative h-20 w-full"
        style={{ background: `linear-gradient(135deg, ${cover}dd, ${cover}55)` }}
      >
        <div className="absolute -bottom-4 left-3 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-lg shadow">
          {project.icon || '📁'}
        </div>
      </div>
      <div className="p-4 pt-6">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate text-sm font-semibold text-slate-100">{project.name}</h3>
          {!project.isPublic && <Lock size={12} className="shrink-0 text-slate-500" />}
        </div>
        {project.key && <p className="mt-0.5 text-xs font-medium tracking-wide text-slate-500">{project.key}</p>}
        {project.description && <p className="mt-1 line-clamp-2 text-xs text-slate-400">{project.description}</p>}
      </div>
    </Link>
  );
}
