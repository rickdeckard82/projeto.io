import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { archiveProject, getProject, listProjectMembers, unarchiveProject } from '../api/projects';
import { queryKeys } from '../api/queryKeys';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { MemberList } from '../components/projects/MemberList';
import { AddMemberDialog } from '../components/projects/AddMemberDialog';

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
  const [addOpen, setAddOpen] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);

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
