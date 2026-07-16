import { CSSProperties, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, CornerDownRight, Layers, Lock, Plus, Tag, UserPlus } from 'lucide-react';
import { Label, Priority, StatusCategory, UserDirectoryEntry, WorkItem } from '../../types';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { COVER_COLOR_PALETTE } from '../../lib/projectDefaults';
import { PRIORITY_OPTIONS, priorityColor, priorityLabel } from '../items/PrioritySelect';

const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

/** Cor da borda neon do card conforme a categoria do status atual; `BACKLOG` fica sem brilho (borda neutra padrão). */
const STATUS_GLOW: Partial<Record<StatusCategory, string>> = {
  UNSTARTED: '#38bdf8',
  STARTED: '#facc15',
  COMPLETED: '#4ade80',
  CANCELLED: '#f87171',
};

function glowStyle(category: StatusCategory): CSSProperties {
  const color = STATUS_GLOW[category];
  return color ? { borderColor: color, boxShadow: `0 0 6px 0 ${color}99, 0 0 1px 0 ${color}` } : {};
}

/**
 * Versão somente-visual do card, usada dentro do `DragOverlay` do dnd-kit enquanto o item é
 * arrastado. Não usa `useDraggable` nem menus interativos — o `DragOverlay` renderiza via
 * `position: fixed`, fora de qualquer contêiner com `overflow`, para a cópia "flutuante" nunca
 * ficar cortada pelas colunas (que têm rolagem própria); o card original permanece no lugar como
 * um placeholder (ver `isDragging` em `KanbanCard`).
 */
export function KanbanCardPreview({ item, parentTitle }: { item: WorkItem; parentTitle?: string }) {
  return (
    <div
      style={glowStyle(item.status.category)}
      className="mb-2 w-72 cursor-grabbing rounded-md border border-slate-800 bg-slate-900 p-3 shadow-2xl"
    >
      {parentTitle && (
        <p className="mb-0.5 flex items-center gap-1 truncate text-[10px] text-slate-500">
          <CornerDownRight size={10} className="shrink-0" />
          {parentTitle}
        </p>
      )}
      <p className="text-sm text-slate-100">{item.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {item.priority !== 'NONE' && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium text-slate-950"
            style={{ backgroundColor: priorityColor(item.priority) }}
          >
            {priorityLabel(item.priority)}
          </span>
        )}
        {item.labels.map((l) => (
          <Badge key={l.label.id} color={l.label.color}>
            {l.label.name}
          </Badge>
        ))}
        {item.subItems.length > 0 && (
          <span className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
            <Layers size={11} />
            {item.subItems.length}
          </span>
        )}
        {item.assignees.length > 0 && (
          <div className="ml-auto flex shrink-0 -space-x-1 pl-1">
            {item.assignees.map((a) => (
              <Avatar key={a.user.id} name={a.user.fullName} src={a.user.avatarUrl} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PriorityMenu({
  value,
  disabled,
  onChange,
}: {
  value: Priority;
  disabled: boolean;
  onChange: (value: Priority) => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          onClick={stop}
          onPointerDown={stop}
          className={
            value === 'NONE'
              ? 'rounded-full border border-dashed border-slate-700 px-2 py-0.5 text-[10px] text-slate-500 hover:border-slate-500 hover:text-slate-300 disabled:hover:border-slate-700 disabled:hover:text-slate-500'
              : 'rounded-full px-2 py-0.5 text-[10px] font-medium text-slate-950'
          }
          style={value !== 'NONE' ? { backgroundColor: priorityColor(value) } : undefined}
        >
          {value === 'NONE' ? '+ Prioridade' : priorityLabel(value)}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          onClick={stop}
          onPointerDown={stop}
          onPointerUp={stop}
          className="w-40 rounded-md border border-slate-800 bg-slate-900 p-1 shadow-xl"
        >
          {PRIORITY_OPTIONS.map((opt) => (
            <DropdownMenu.Item
              key={opt.value}
              onSelect={() => onChange(opt.value)}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-slate-100 outline-none hover:bg-slate-800"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: opt.color }} />
              {opt.label}
              {opt.value === value && <Check size={12} className="ml-auto text-indigo-400" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function LabelMenu({
  labels,
  selectedIds,
  disabled,
  onToggle,
  onCreate,
}: {
  labels: Label[];
  selectedIds: string[];
  disabled: boolean;
  onToggle: (labelId: string) => void;
  onCreate: (name: string, color: string) => Promise<Label>;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COVER_COLOR_PALETTE[0]);
  const [creating, setCreating] = useState(false);

  const submitCreate = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      const created = await onCreate(name.trim(), color);
      onToggle(created.id);
      setName('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          onClick={stop}
          onPointerDown={stop}
          className="flex items-center justify-center rounded-full border border-dashed border-slate-700 p-1 text-slate-500 hover:border-slate-500 hover:text-slate-300 disabled:hover:border-slate-700 disabled:hover:text-slate-500"
        >
          <Tag size={11} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          onClick={stop}
          onPointerDown={stop}
          onPointerUp={stop}
          className="w-56 rounded-md border border-slate-800 bg-slate-900 p-1 shadow-xl"
        >
          <div className="thin-scrollbar max-h-48 overflow-y-auto">
            {labels.map((label) => (
              <DropdownMenu.CheckboxItem
                key={label.id}
                checked={selectedIds.includes(label.id)}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={() => onToggle(label.id)}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-slate-100 outline-none hover:bg-slate-800"
              >
                <Badge color={label.color}>{label.name}</Badge>
                {selectedIds.includes(label.id) && <Check size={12} className="ml-auto text-indigo-400" />}
              </DropdownMenu.CheckboxItem>
            ))}
            {labels.length === 0 && (
              <div className="px-2 py-1.5 text-xs text-slate-500">Nenhuma etiqueta criada.</div>
            )}
          </div>
          <div className="mt-1 border-t border-slate-800 p-1.5">
            <div className="mb-1.5 flex gap-1">
              {COVER_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-4 w-4 rounded-full ${color === c ? 'ring-2 ring-slate-300 ring-offset-1 ring-offset-slate-900' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-1">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') submitCreate();
                }}
                placeholder="Nova etiqueta"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
              />
              <button
                type="button"
                disabled={!name.trim() || creating}
                onClick={submitCreate}
                className="flex shrink-0 items-center justify-center rounded-md bg-indigo-600 px-2 text-slate-100 hover:bg-indigo-500 disabled:opacity-50"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function AssigneeMenu({
  users,
  selectedIds,
  disabled,
  onToggle,
}: {
  users: UserDirectoryEntry[];
  selectedIds: string[];
  disabled: boolean;
  onToggle: (userId: string) => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" disabled={disabled} onClick={stop} onPointerDown={stop}>
          {selectedIds.length === 0 ? (
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300">
              <UserPlus size={12} />
            </span>
          ) : (
            <span className="flex -space-x-1">
              {users
                .filter((u) => selectedIds.includes(u.id))
                .map((u) => (
                  <Avatar key={u.id} name={u.fullName} src={u.avatarUrl} />
                ))}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          onClick={stop}
          onPointerDown={stop}
          onPointerUp={stop}
          className="thin-scrollbar max-h-64 w-56 overflow-y-auto rounded-md border border-slate-800 bg-slate-900 p-1 shadow-xl"
        >
          {users.map((u) => (
            <DropdownMenu.CheckboxItem
              key={u.id}
              checked={selectedIds.includes(u.id)}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={() => onToggle(u.id)}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-100 outline-none hover:bg-slate-800"
            >
              <Avatar name={u.fullName} src={u.avatarUrl} />
              {u.fullName}
              {selectedIds.includes(u.id) && <Check size={12} className="ml-auto text-indigo-400" />}
            </DropdownMenu.CheckboxItem>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function KanbanCard({
  item,
  canEdit,
  currentUserId,
  isAdmin,
  labels,
  users,
  parentTitle,
  onOpen,
  onChangePriority,
  onChangeAssignees,
  onChangeLabels,
  onCreateLabel,
}: {
  item: WorkItem;
  canEdit: boolean;
  currentUserId?: string;
  isAdmin: boolean;
  labels: Label[];
  users: UserDirectoryEntry[];
  parentTitle?: string;
  onOpen: () => void;
  onChangePriority: (priority: Priority) => void;
  onChangeAssignees: (userIds: string[]) => void;
  onChangeLabels: (labelIds: string[]) => void;
  onCreateLabel: (name: string, color: string) => Promise<Label>;
}) {
  const isLockedByOther = !!item.statusLockedById && item.statusLockedById !== currentUserId && !isAdmin;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id, disabled: isLockedByOther });

  const glowColor = STATUS_GLOW[item.status.category];
  const style = glowStyle(item.status.category);

  const assigneeIds = item.assignees.map((a) => a.user.id);
  const labelIds = item.labels.map((l) => l.label.id);

  const toggleAssignee = (userId: string) => {
    onChangeAssignees(
      assigneeIds.includes(userId) ? assigneeIds.filter((id) => id !== userId) : [...assigneeIds, userId],
    );
  };

  const toggleLabel = (labelId: string) => {
    onChangeLabels(labelIds.includes(labelId) ? labelIds.filter((id) => id !== labelId) : [...labelIds, labelId]);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      className={`mb-2 cursor-pointer rounded-md border border-slate-800 bg-slate-900 p-3 transition-shadow ${
        glowColor ? '' : 'hover:border-indigo-600'
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      {parentTitle && (
        <p className="mb-0.5 flex items-center gap-1 truncate text-[10px] text-slate-500">
          <CornerDownRight size={10} className="shrink-0" />
          {parentTitle}
        </p>
      )}
      {item.statusLockedBy && (
        <p
          className="mb-0.5 flex items-center gap-1 truncate text-[10px] text-amber-500"
          title={`Travado por ${item.statusLockedBy.fullName} enquanto "Em andamento"`}
        >
          <Lock size={10} className="shrink-0" />
          {item.statusLockedBy.fullName}
        </p>
      )}
      <p className="text-sm text-slate-100">{item.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {(canEdit || item.priority !== 'NONE') && (
          <PriorityMenu value={item.priority} disabled={!canEdit} onChange={onChangePriority} />
        )}
        {item.labels.map((l) => (
          <Badge key={l.label.id} color={l.label.color}>
            {l.label.name}
          </Badge>
        ))}
        {canEdit && (
          <LabelMenu
            labels={labels}
            selectedIds={labelIds}
            disabled={!canEdit}
            onToggle={toggleLabel}
            onCreate={onCreateLabel}
          />
        )}
        {item.subItems.length > 0 && (
          <span className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
            <Layers size={11} />
            {item.subItems.length}
          </span>
        )}
        {(canEdit || assigneeIds.length > 0) && (
          <div className="ml-auto shrink-0 pl-1">
            <AssigneeMenu users={users} selectedIds={assigneeIds} disabled={!canEdit} onToggle={toggleAssignee} />
          </div>
        )}
      </div>
    </div>
  );
}
