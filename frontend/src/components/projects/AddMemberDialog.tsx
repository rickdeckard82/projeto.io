import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listUserDirectory } from '../../api/users';
import { addProjectMember } from '../../api/projects';
import { queryKeys } from '../../api/queryKeys';
import { Button } from '../common/Button';

export function AddMemberDialog({
  projectId,
  existingUserIds,
  open,
  onOpenChange,
}: {
  projectId: string;
  existingUserIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: users } = useQuery({ queryKey: queryKeys.userDirectory, queryFn: listUserDirectory });
  const [selectedUserId, setSelectedUserId] = useState('');
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: (userId: string) => addProjectMember(projectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectMembers(projectId) });
      onOpenChange(false);
      setSelectedUserId('');
    },
  });

  const availableUsers = users?.filter((u) => !existingUserIds.includes(u.id)) || [];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-800 bg-slate-900 p-5 shadow-xl">
          <Dialog.Title className="mb-4 text-sm font-semibold text-slate-100">Adicionar membro</Dialog.Title>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="mb-4 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Selecione um usuário</option>
            {availableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button disabled={!selectedUserId} onClick={() => addMutation.mutate(selectedUserId)}>
              Adicionar
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
