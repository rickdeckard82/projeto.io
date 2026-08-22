import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Lock } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getItem, createItem, updateItemStatus } from '../../api/workItems';
import { listProjectStatuses } from '../../api/projects';
import { queryKeys } from '../../api/queryKeys';
import { useAuth } from '../../auth/AuthContext';
import { canEditItem } from '../../lib/permissions';
import { useWorkItems } from '../../hooks/useWorkItems';
import { Button } from '../common/Button';
import { Spinner } from '../common/Spinner';
import { Toast } from '../common/Toast';
import { Avatar } from '../common/Avatar';
import { PrioritySelect } from './PrioritySelect';
import { RecurrenceSelect } from './RecurrenceSelect';
import { ReminderSelect } from './ReminderSelect';
import { combineDateTime, timeInputValue } from '../../lib/dateFormat';
import { AssigneePicker } from './AssigneePicker';
import { LabelPicker } from './LabelPicker';
import { SubItemList } from './SubItemList';
import { ActivityFeed } from './ActivityFeed';

/** Segundos acumulados em "Em andamento", somando o intervalo em curso se o item estiver nesse status agora. */
function effectiveInProgressSeconds(item: { inProgressSeconds: number; inProgressSince: string | null }): number {
  const ongoing = item.inProgressSince ? (Date.now() - new Date(item.inProgressSince).getTime()) / 1000 : 0;
  return item.inProgressSeconds + ongoing;
}

function formatInProgressDuration(seconds: number): string {
  if (seconds < 60) return '< 1 min';
  const hours = seconds / 3600;
  if (hours < 1) return `${Math.round(seconds / 60)} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} dias`;
}

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
  const isLockedByOther =
    !!item?.statusLockedById && item.statusLockedById !== user?.id && user?.globalRole !== 'ADMIN';
  const isClosedForNonAdmin =
    (item?.status.category === 'COMPLETED' || item?.status.category === 'CANCELLED') && user?.globalRole !== 'ADMIN';

  const { updateItem, updateItemAssignees, updateItemLabels, deleteItem } = useWorkItems(projectId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description || '');
      setStartDate(item.startDate?.slice(0, 10) || '');
      setStartTime(item.startDate ? timeInputValue(item.startDate) : '');
      setDueDate(item.dueDate?.slice(0, 10) || '');
      setDueTime(item.dueDate ? timeInputValue(item.dueDate) : '');
    }
  }, [item?.id]);

  const invalidateItem = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.item(itemId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.itemActivities(itemId) });
  };

  const statusMutation = useMutation({
    mutationFn: (statusId: string) => updateItemStatus(itemId, statusId),
    onSuccess: () => {
      invalidateItem();
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'items'] });
    },
    onError: (err: any) => setError(err?.response?.data?.message || 'Não foi possível mover o item.'),
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

  const saveStartDate = (date: string, time: string) => {
    updateItem({ id: itemId, data: { startDate: date ? combineDateTime(date, time) : undefined } }).then(invalidateItem);
  };

  const saveDueDate = (date: string, time: string) => {
    updateItem({ id: itemId, data: { dueDate: date ? combineDateTime(date, time) : undefined } }).then(invalidateItem);
  };

  return (
    <>
      <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
        <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="thin-scrollbar fixed left-1/2 top-1/2 max-h-[85vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-xl">
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

              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>Criado por</span>
                <Avatar name={item.createdBy.fullName} src={item.createdBy.avatarUrl} size={16} />
                <span className="text-slate-300">{item.createdBy.fullName}</span>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                <div>
                  <label className="mb-1 flex items-center gap-1">
                    Status
                    {item.statusLockedBy && (
                      <span
                        className="flex items-center gap-1 text-amber-500"
                        title={`Travado por ${item.statusLockedBy.fullName} enquanto "Em andamento"`}
                      >
                        <Lock size={10} />
                        {item.statusLockedBy.fullName}
                      </span>
                    )}
                    {isClosedForNonAdmin && (
                      <span className="flex items-center gap-1 text-amber-500" title="Concluído/cancelado — só um Admin pode reabrir">
                        <Lock size={10} />
                        Encerrado
                      </span>
                    )}
                  </label>
                  <select
                    value={item.statusId}
                    disabled={!editable || isLockedByOther || isClosedForNonAdmin}
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
                  <div className="flex gap-1">
                    <input
                      type="date"
                      disabled={!editable}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      onBlur={() => saveStartDate(startDate, startTime)}
                      className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 disabled:opacity-50"
                    />
                    <input
                      type="time"
                      disabled={!editable}
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      onBlur={() => saveStartDate(startDate, startTime)}
                      className="w-20 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 disabled:opacity-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block">Vencimento</label>
                  <div className="flex gap-1">
                    <input
                      type="date"
                      disabled={!editable}
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      onBlur={() => saveDueDate(dueDate, dueTime)}
                      className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 disabled:opacity-50"
                    />
                    <input
                      type="time"
                      disabled={!editable}
                      value={dueTime}
                      onChange={(e) => setDueTime(e.target.value)}
                      onBlur={() => saveDueDate(dueDate, dueTime)}
                      className="w-20 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 disabled:opacity-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block">Lembrete</label>
                  <ReminderSelect
                    reminderAt={item.reminderAt}
                    reminderOffsetMinutes={item.reminderOffsetMinutes}
                    dueDate={item.dueDate}
                    disabled={!editable}
                    onChange={(reminderAt, reminderOffsetMinutes) =>
                      updateItem({ id: itemId, data: { reminderAt, reminderOffsetMinutes } }).then(invalidateItem)
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block">Tempo em andamento</label>
                  <span className="inline-block py-1 text-slate-300">
                    {formatInProgressDuration(effectiveInProgressSeconds(item))}
                  </span>
                </div>
                <div>
                  <label className="mb-1 block">Recorrência</label>
                  <RecurrenceSelect
                    unit={item.recurrenceUnit}
                    interval={item.recurrenceInterval}
                    disabled={!editable}
                    onChange={(recurrenceUnit, recurrenceInterval) =>
                      updateItem({ id: itemId, data: { recurrenceUnit, recurrenceInterval } }).then(invalidateItem)
                    }
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

              <div className="border-t border-slate-800 pt-4">
                <label className="mb-2 block text-xs text-slate-400">Atividade</label>
                <ActivityFeed itemId={itemId} canComment={editable} />
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
    {error && <Toast message={error} onClose={() => setError(null)} />}
    </>
  );
}
