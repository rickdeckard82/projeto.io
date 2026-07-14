import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createProject, listProjects } from '../api/projects';
import { queryKeys } from '../api/queryKeys';
import { RoleGate } from '../auth/RoleGate';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { EmptyState } from '../components/common/EmptyState';
import { ProjectCard } from '../components/projects/ProjectCard';
import { ProjectForm } from '../components/projects/ProjectForm';

export function ProjectsListPage() {
  const { data: projects, isLoading } = useQuery({
    queryKey: queryKeys.projects(false),
    queryFn: () => listProjects(false),
  });
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setOpen(false);
    },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-100">Projetos</h1>
        <RoleGate allow={['ADMIN']}>
          <Button onClick={() => setOpen(true)}>Adicionar Projeto</Button>
        </RoleGate>
      </div>

      {isLoading && <Spinner />}

      {!isLoading && (!projects || projects.length === 0) && (
        <EmptyState title="Nenhum projeto ainda" description="Peça a um administrador para criar um projeto." />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects?.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      <ProjectForm open={open} onOpenChange={setOpen} onSubmit={(data) => createMutation.mutateAsync(data).then(() => {})} />
    </div>
  );
}
