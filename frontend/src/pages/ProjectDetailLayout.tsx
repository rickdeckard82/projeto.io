import { NavLink, Outlet, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProject } from '../api/projects';
import { queryKeys } from '../api/queryKeys';
import { RoleGate } from '../auth/RoleGate';
import { Spinner } from '../components/common/Spinner';

const tabs = [
  { to: 'board', label: 'Quadro' },
  { to: 'list', label: 'Lista' },
  { to: 'documents', label: 'Documentos' },
];

export function ProjectDetailLayout() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, isLoading } = useQuery({
    queryKey: queryKeys.project(projectId!),
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
  });

  if (isLoading) return <Spinner />;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-1 flex items-center gap-2">
        {project?.icon && <span className="text-lg">{project.icon}</span>}
        <h1 className="text-lg font-semibold text-slate-100">{project?.name}</h1>
        {project?.key && (
          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs font-medium tracking-wide text-slate-400">
            {project.key}
          </span>
        )}
      </div>
      {project?.description && <p className="mb-4 text-sm text-slate-400">{project.description}</p>}

      <div className="mb-6 flex gap-1 border-b border-slate-800">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `px-3 py-2 text-sm ${
                isActive ? 'border-b-2 border-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
        <RoleGate allow={['ADMIN']}>
          <NavLink
            to="settings"
            className={({ isActive }) =>
              `px-3 py-2 text-sm ${
                isActive ? 'border-b-2 border-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            Configurações
          </NavLink>
        </RoleGate>
      </div>

      <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
