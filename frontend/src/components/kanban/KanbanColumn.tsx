import { FormEvent, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Label, Priority, Status, User, WorkItem } from '../../types';
import { KanbanCard } from './KanbanCard';

export function KanbanColumn({
  status,
  items,
  canCreate,
  canEdit,
  labels,
  users,
  getParentTitle,
  onOpen,
  onCreate,
  onChangePriority,
  onChangeAssignees,
  onChangeLabels,
  onCreateLabel,
}: {
  status: Status;
  items: WorkItem[];
  canCreate: boolean;
  canEdit: boolean;
  labels: Label[];
  users: User[];
  getParentTitle: (parentId: string) => string | undefined;
  onOpen: (id: string) => void;
  onCreate: (title: string) => Promise<void>;
  onChangePriority: (id: string, priority: Priority) => void;
  onChangeAssignees: (id: string, userIds: string[]) => void;
  onChangeLabels: (id: string, labelIds: string[]) => void;
  onCreateLabel: (name: string, color: string) => Promise<Label>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });
  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onCreate(title.trim());
    setTitle('');
    setAdding(false);
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full w-72 shrink-0 flex-col rounded-lg border p-2 ${
        isOver ? 'border-indigo-500 bg-indigo-950/20' : 'border-slate-800 bg-slate-950/40'
      }`}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{status.name}</h3>
        <span className="text-xs text-slate-600">{items.length}</span>
      </div>

      <div className="thin-scrollbar min-h-[4rem] flex-1 overflow-y-auto px-0.5">
        {items.map((item) => (
          <KanbanCard
            key={item.id}
            item={item}
            canEdit={canEdit}
            labels={labels}
            users={users}
            parentTitle={item.parentId ? getParentTitle(item.parentId) : undefined}
            onOpen={() => onOpen(item.id)}
            onChangePriority={(priority) => onChangePriority(item.id, priority)}
            onChangeAssignees={(userIds) => onChangeAssignees(item.id, userIds)}
            onChangeLabels={(labelIds) => onChangeLabels(item.id, labelIds)}
            onCreateLabel={onCreateLabel}
          />
        ))}
      </div>

      {canCreate && (
        <div className="px-1">
          {adding ? (
            <form onSubmit={submit}>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => !title && setAdding(false)}
                placeholder="Título do item"
                className="mb-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
              />
            </form>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full rounded-md py-1 text-left text-xs text-slate-500 hover:bg-slate-900 hover:text-slate-300"
            >
              + Novo item
            </button>
          )}
        </div>
      )}
    </div>
  );
}
