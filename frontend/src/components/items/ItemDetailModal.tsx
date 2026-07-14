import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getItem, createItem, updateItemStatus } from '../../api/workItems';
import { listProjectStatuses } from '../../api/projects';
import { queryKeys } from '../../api/queryKeys';
import { useAuth } from '../../auth/AuthContext';
import { canEditItem } from '../../lib/permissions';
import { useWorkItems } from '../../hooks/useWorkItems';
import { Button } from '../common/Button';
import { Spinner } from '../common/Spinner';
import { PrioritySelect } from './PrioritySelect';
import { AssigneePicker } from './AssigneePicker';
import { LabelPicker } from './LabelPicker';
import { SubItemList } from './SubItemList';

export function ItemDetailModal({
  projectId,
  itemId,
  onClose,
  onOpenItem,
}: {
  projectId: string;
  itemId: string;
  onClose: () => void;
  onOpenItem: (id: string) => void;
}) {
  const { user } = useAuth();
  const editable = user ? canEditItem(user.globalRole) : false;
  const queryClient = useQueryClient();

  const { data: item, isLoading } = useQuery({
    queryKey: queryKeys.item(itemId),
    queryFn: () => getItem(itemId),
  });
  const { data: statuses } = useQuery({
    queryKey: queryKeys.projectStatuses(projectId),
    queryFn: () => listProjectStatuses(projectId),
  });

  const { updateItem, updateItemAssignees, updateItemLabels, deleteItem } = useWorkItems(projectId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description || '');
    }
  }, [item?.id]);

  const invalidateItem = () => queryClient.invalidateQueries({ queryKey: queryKeys.item(itemId) });

  const statusMutation = useMutation({
    mutationFn: (statusId: string) => updateItemStatus(itemId, statusId),
    onSuccess: () => {
      invalidateItem();
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'items'] });
    },
  });

  const createSubItem = async (subTitle: string) => {
    await createItem(projectId, { title: subTitle, parentId: itemId });
    invalidateItem();
    queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'items'] });
  };

  const saveTextFields = async () => {
    if (!item) return;
    await updateItem({ id: itemId, data: { title, description } });
    invalidateItem();
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 max-h-[85vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-xl">
          {isLoading || !item ? (
            <Spinner />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <input
                  value={title}
                  disabled={!editable}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={saveTextFields}
                  className="flex-1 bg-transparent text-lg font-semibold text-slate-100 outline-none disabled:opacity-70"
                />
                <Dialog.Close asChild>
                  <button className="text-slate-500 hover:text-slate-300">✕</button>
                </Dialog.Close>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                <div>
                  <label className="mb-1 block">Status</label>
                  <select
                    value={item.statusId}
                    disabled={!editable}
                    onChange={(e) => statusMutation.mutate(e.target.value)}
                    className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 disabled:opacity-50"
                  >
                    {statuses?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block">Prioridade</label>
                  <PrioritySelect
                    value={item.priority}
                    disabled={!editable}
                    onChange={(priority) => updateItem({ id: itemId, data: { priority } }).then(invalidateItem)}
                  />
                </div>
                <div>
                  <label className="mb-1 block">Início</label>
                  <input
                    type="date"
                    disabled={!editable}
                    defaultValue={item.startDate?.slice(0, 10) || ''}
                    onBlur={(e) => updateItem({ id: itemId, data: { startDate: e.target.value || undefined } }).then(invalidateItem)}
                    className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="mb-1 block">Vencimento</label>
                  <input
                    type="date"
                    disabled={!editable}
                    defaultValue={item.dueDate?.slice(0, 10) || ''}
                    onBlur={(e) => updateItem({ id: itemId, data: { dueDate: e.target.value || undefined } }).then(invalidateItem)}
                    className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">Descrição</label>
                <textarea
                  value={description}
                  disabled={!editable}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={saveTextFields}
                  rows={4}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:opacity-70"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">Responsáveis</label>
                <AssigneePicker
                  selectedUserIds={item.assignees.map((a) => a.user.id)}
                  disabled={!editable}
                  onChange={(userIds) => updateItemAssignees({ id: itemId, userIds }).then(invalidateItem)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">Etiquetas</label>
                <LabelPicker
                  projectId={projectId}
                  selectedLabelIds={item.labels.map((l) => l.label.id)}
                  disabled={!editable}
                  onChange={(labelIds) => updateItemLabels({ id: itemId, labelIds }).then(invalidateItem)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">Sub-itens</label>
                <SubItemList
                  subItems={item.subItems}
                  canEdit={editable}
                  onCreate={createSubItem}
                  onOpen={onOpenItem}
                />
              </div>

              {editable && (
                <div className="flex justify-end border-t border-slate-800 pt-3">
                  <Button
                    variant="danger"
                    onClick={() => deleteItem(itemId).then(() => onClose())}
                  >
                    Excluir item
                  </Button>
                </div>
              )}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
