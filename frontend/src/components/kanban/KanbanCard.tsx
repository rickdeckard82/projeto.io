import { useDraggable } from '@dnd-kit/core';
import { WorkItem } from '../../types';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { priorityColor, priorityLabel } from '../items/PrioritySelect';

export function KanbanCard({ item, onOpen }: { item: WorkItem; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      className={`mb-2 cursor-pointer rounded-md border border-slate-800 bg-slate-900 p-3 hover:border-indigo-600 ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
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
      </div>
      {item.assignees.length > 0 && (
        <div className="mt-2 flex -space-x-1">
          {item.assignees.map((a) => (
            <Avatar key={a.user.id} name={a.user.fullName} />
          ))}
        </div>
      )}
    </div>
  );
}
