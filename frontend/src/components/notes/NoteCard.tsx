import { Pencil, Trash2 } from 'lucide-react';
import { Note } from '../../types';
import { Avatar } from '../common/Avatar';
import { relativeTime } from '../../lib/relativeTime';

const DEFAULT_COLOR = '#EAB308';

/** Deriva uma leve rotação (-2° a 2°) a partir do id da nota, para o efeito de "papeizinhos colados meio tortos" — determinística (não recalcula a cada render) em vez de aleatória. */
function rotationForId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 5) - 2;
}

export function NoteCard({ note, onEdit, onDelete }: { note: Note; onEdit?: () => void; onDelete?: () => void }) {
  const color = note.color || DEFAULT_COLOR;
  const rotation = rotationForId(note.id);

  return (
    <div
      className="group relative flex flex-col justify-between rounded-sm p-4 shadow-lg transition-transform duration-150 hover:z-10 hover:rotate-0 hover:shadow-xl"
      style={{ backgroundColor: color, transform: `rotate(${rotation}deg)` }}
    >
      <span className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-black/20 bg-red-600 shadow" />

      <p className="mb-4 whitespace-pre-wrap break-words text-sm font-medium text-slate-950">{note.content}</p>

      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-800">
          <Avatar name={note.createdBy.fullName} src={note.createdBy.avatarUrl} size={16} />
          <span className="truncate font-medium">{note.createdBy.fullName}</span>
          <span className="shrink-0 opacity-70">· {relativeTime(note.createdAt)}</span>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {onEdit && (
              <button onClick={onEdit} title="Editar" className="text-slate-800 hover:text-slate-950">
                <Pencil size={14} />
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} title="Excluir" className="text-slate-800 hover:text-red-700">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
