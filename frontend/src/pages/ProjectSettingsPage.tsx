import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { archiveProject, getProject, listProjectMembers, unarchiveProject } from '../api/projects';
import { createModule, deleteModule, listModules, updateModule } from '../api/modules';
import { queryKeys } from '../api/queryKeys';
import { Module } from '../types';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { MemberList } from '../components/projects/MemberList';
import { AddMemberDialog } from '../components/projects/AddMemberDialog';
import { ModuleList } from '../components/projects/ModuleList';
import { ModuleDialog } from '../components/projects/ModuleDialog';

export function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: queryKeys.project(projectId!),
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
  });
  const { data: members, isLoading } = useQuery({
    queryKey: queryKeys.projectMembers(projectId!),
    queryFn: () => listProjectMembers(projectId!),
    enabled: !!projectId,
  });
  const { data: modules } = useQuery({
    queryKey: queryKeys.projectModules(projectId!),
    queryFn: () => listModules(projectId!),
    enabled: !!projectId,
  });
  const [addOpen, setAddOpen] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);

  const invalidateModules = () => queryClient.invalidateQueries({ queryKey: queryKeys.projectModules(projectId!) });
  const createModuleMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) => createModule(projectId!, data),
    onSuccess: invalidateModules,
  });
  const updateModuleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string } }) => updateModule(id, data),
    onSuccess: invalidateModules,
  });
  const deleteModuleMutation = useMutation({
    mutationFn: (id: string) => deleteModule(id),
    onSuccess: invalidateModules,
  });

  const openCreateModule = () => {
    setEditingModule(null);
    setModuleDialogOpen(true);
  };

  const openEditModule = (module: Module) => {
    setEditingModule(module);
    setModuleDialogOpen(true);
  };

  const archiveMutation = useMutation({
    mutationFn: () => archiveProject(projectId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setConfirmArchiveOpen(false);
      navigate('/projects');
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: () => unarchiveProject(projectId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">Membros do projeto</h2>
        <Button onClick={() => setAddOpen(true)}>Adicionar membro</Button>
      </div>
      <MemberList projectId={projectId!} members={members || []} />
      <AddMemberDialog
        projectId={projectId!}
        existingUserIds={members?.map((m) => m.userId) || []}
        open={addOpen}
        onOpenChange={setAddOpen}
      />

      <div className="mb-4 mt-10 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">Módulos</h2>
        <Button onClick={openCreateModule}>Criar módulo</Button>
      </div>
      {!modules || modules.length === 0 ? (
        <EmptyState title="Nenhum módulo ainda" description="Crie módulos para agrupar itens deste projeto (ex.: Sprint 1, Backend)." />
      ) : (
        <ModuleList
          modules={modules}
          onEdit={openEditModule}
          onDelete={(module) => deleteModuleMutation.mutateAsync(module.id).then(() => {})}
        />
      )}
      <ModuleDialog
        open={moduleDialogOpen}
        onOpenChange={setModuleDialogOpen}
        module={editingModule}
        onSubmit={(data) =>
          editingModule
            ? updateModuleMutation.mutateAsync({ id: editingModule.id, data }).then(() => {})
            : createModuleMutation.mutateAsync(data).then(() => {})
        }
      />

      <div className="mt-10 rounded-md border border-red-900/40 bg-red-950/10 p-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-200">Zona de risco</h2>
        {project?.archivedAt ? (
          <>
            <p className="mb-3 text-xs text-slate-400">Este projeto está arquivado e não aparece na lista de projetos ativos.</p>
            <Button variant="secondary" onClick={() => unarchiveMutation.mutate()}>
              Desarquivar projeto
            </Button>
          </>
        ) : (
          <>
            <p className="mb-3 text-xs text-slate-400">
              Arquivar o projeto o remove da lista de projetos ativos, mas mantém todos os dados.
            </p>
            <Button variant="danger" onClick={() => setConfirmArchiveOpen(true)}>
              Arquivar projeto
            </Button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmArchiveOpen}
        title="Arquivar projeto"
        description="O projeto deixará de aparecer na lista de projetos ativos. Você pode desarquivá-lo depois em Arquivos."
        confirmLabel="Arquivar"
        onConfirm={() => archiveMutation.mutate()}
        onCancel={() => setConfirmArchiveOpen(false)}
      />
    </div>
  );
}
