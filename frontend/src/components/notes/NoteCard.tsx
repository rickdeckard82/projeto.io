import { Pencil, Trash2 } from 'lucide-react';
import { Note } from '../../types';
import { Avatar } from '../common/Avatar';
import { relativeTime } from '../../lib/relativeTime';

export function NoteCard({ note, onEdit, onDelete }: { note: Note; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <div
      className="flex flex-col justify-between rounded-md border border-t-4 border-slate-800 bg-slate-900 p-3"
      style={{ borderTopColor: note.color || '#64748b' }}
    >
      <p className="mb-3 whitespace-pre-wrap break-words text-sm text-slate-100">{note.content}</p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
          <Avatar name={note.createdBy.fullName} src={note.createdBy.avatarUrl} size={16} />
          <span className="truncate text-slate-400">{note.createdBy.fullName}</span>
          <span className="shrink-0">· {relativeTime(note.createdAt)}</span>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex shrink-0 gap-1">
            {onEdit && (
              <button onClick={onEdit} title="Editar" className="text-slate-500 hover:text-slate-300">
                <Pencil size={14} />
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} title="Excluir" className="text-slate-500 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
