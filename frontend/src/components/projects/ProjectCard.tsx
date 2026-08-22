import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, MoreVertical } from 'lucide-react';
import { Project } from '../../types';
import { RoleGate } from '../../auth/RoleGate';
import { PolygonBackground } from '../common/PolygonBackground';
import { EditProjectDialog } from './EditProjectDialog';

export function ProjectCard({ project }: { project: Project }) {
  const cover = project.coverColor || '#6366F1';
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-800 bg-slate-900 transition-colors hover:border-indigo-600">
      <Link to={`/projects/${project.id}/board`} className="block">
        <div className="relative h-20 w-full">
          <div className="absolute inset-0 overflow-hidden" style={{ background: '#020617' }}>
            <PolygonBackground color={cover} />
          </div>
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

      <RoleGate allow={['ADMIN', 'SENIOR']}>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          title="Editar projeto"
          className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-md bg-black/50 text-white/80 outline-none hover:bg-black/70 hover:text-white"
        >
          <MoreVertical size={16} />
        </button>
      </RoleGate>

      <EditProjectDialog project={project} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
