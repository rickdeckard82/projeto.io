import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive } from 'lucide-react';
import { listProjects, unarchiveProject } from '../api/projects';
import { queryKeys } from '../api/queryKeys';
import { RoleGate } from '../auth/RoleGate';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { EmptyState } from '../components/common/EmptyState';

export function ArchivedProjectsPage() {
  const { data: projects, isLoading } = useQuery({
    queryKey: queryKeys.projects(true),
    queryFn: () => listProjects(true),
  });
  const queryClient = useQueryClient();

  const unarchiveMutation = useMutation({
    mutationFn: unarchiveProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <Archive size={18} className="text-slate-400" />
        <h1 className="text-lg font-semibold text-slate-100">Arquivos</h1>
      </div>

      {isLoading && <Spinner />}

      {!isLoading && (!projects || projects.length === 0) && (
        <EmptyState title="Nenhum projeto arquivado" description="Projetos arquivados por um administrador aparecerão aqui." />
      )}

      <div className="flex flex-col gap-2">
        {projects?.map((project) => (
          <div
            key={project.id}
            className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 p-4"
          >
            <div>
              <Link to={`/projects/${project.id}/board`} className="text-sm font-semibold text-slate-100 hover:underline">
                {project.name}
              </Link>
              {project.description && <p className="mt-1 text-xs text-slate-400">{project.description}</p>}
            </div>
            <RoleGate allow={['ADMIN']}>
              <Button variant="secondary" onClick={() => unarchiveMutation.mutate(project.id)}>
                Desarquivar
              </Button>
            </RoleGate>
          </div>
        ))}
      </div>
    </div>
  );
}
