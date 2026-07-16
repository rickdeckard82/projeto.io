import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createNote, listNotes } from '../../api/notes';
import { queryKeys } from '../../api/queryKeys';
import { Button } from '../common/Button';
import { Spinner } from '../common/Spinner';
import { EmptyState } from '../common/EmptyState';
import { NoteCard } from '../notes/NoteCard';
import { NoteDialog } from '../notes/NoteDialog';

const HOME_PREVIEW_LIMIT = 6;

/**
 * Resumo do mural de notas na página inicial: mostra as mais recentes e permite criar uma nova
 * rapidamente. Editar/excluir só na página dedicada (`/notes`), acessível pelo link "Ver todas".
 */
export function NotesSection() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: notes, isLoading } = useQuery({
    queryKey: queryKeys.notes(HOME_PREVIEW_LIMIT),
    queryFn: () => listNotes(HOME_PREVIEW_LIMIT),
  });

  const createMutation = useMutation({
    mutationFn: createNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">Notas</h2>
        <div className="flex items-center gap-3">
          <Link to="/notes" className="text-xs text-indigo-400 hover:text-indigo-300">
            Ver todas
          </Link>
          <Button variant="secondary" onClick={() => setCreateOpen(true)}>
            + Nova nota
          </Button>
        </div>
      </div>

      {isLoading && <Spinner />}

      {!isLoading && (!notes || notes.length === 0) && (
        <EmptyState title="Nenhuma nota ainda" description="Crie a primeira nota compartilhada com a equipe." />
      )}

      {!isLoading && notes && notes.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}

      <NoteDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(data) => createMutation.mutateAsync(data).then(() => {})}
      />
    </div>
  );
}
