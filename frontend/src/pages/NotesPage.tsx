import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StickyNote } from 'lucide-react';
import { createNote, deleteNote, listNotes, updateNote } from '../api/notes';
import { queryKeys } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { Note } from '../types';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { NoteCard } from '../components/notes/NoteCard';
import { NoteDialog } from '../components/notes/NoteDialog';

export function NotesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);

  const { data: notes, isLoading } = useQuery({
    queryKey: queryKeys.notes(),
    queryFn: () => listNotes(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notes'] });

  const createMutation = useMutation({ mutationFn: createNote, onSuccess: invalidate });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { content?: string; color?: string } }) => updateNote(id, data),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNote(id),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
    },
  });

  const openCreate = () => {
    setEditingNote(null);
    setDialogOpen(true);
  };

  const openEdit = (note: Note) => {
    setEditingNote(note);
    setDialogOpen(true);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote size={18} className="text-slate-400" />
          <h1 className="text-lg font-semibold text-slate-100">Notas</h1>
        </div>
        <Button onClick={openCreate}>+ Nova nota</Button>
      </div>

      {isLoading && <Spinner />}

      {!isLoading && (!notes || notes.length === 0) && (
        <EmptyState title="Nenhuma nota ainda" description="Crie a primeira nota compartilhada com a equipe." />
      )}

      {!isLoading && notes && notes.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => {
            const canModify = user?.id === note.createdById || user?.globalRole === 'ADMIN';
            return (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={canModify ? () => openEdit(note) : undefined}
                onDelete={canModify ? () => setDeleteTarget(note) : undefined}
              />
            );
          })}
        </div>
      )}

      <NoteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        note={editingNote}
        onSubmit={(data) =>
          editingNote
            ? updateMutation.mutateAsync({ id: editingNote.id, data }).then(() => {})
            : createMutation.mutateAsync(data).then(() => {})
        }
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir nota"
        description="Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
