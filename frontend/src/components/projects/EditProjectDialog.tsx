import { FormEvent, useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Project } from '../../types';
import { updateProject } from '../../api/projects';
import { COVER_COLOR_PALETTE } from '../../lib/projectDefaults';
import { Button } from '../common/Button';
import { PolygonBackground } from '../common/PolygonBackground';
import { EmojiPickerButton } from './EmojiPickerButton';
import { VisibilityToggle } from './VisibilityToggle';
import { LeadPicker } from './LeadPicker';

export function EditProjectDialog({
  project,
  open,
  onOpenChange,
}: {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState(project.description || '');
  const [icon, setIcon] = useState(project.icon || '📁');
  const [coverColor, setCoverColor] = useState(project.coverColor || COVER_COLOR_PALETTE[0]);
  const [isPublic, setIsPublic] = useState(project.isPublic);
  const [ownerId, setOwnerId] = useState<string | null>(project.ownerId);

  useEffect(() => {
    if (open) {
      setDescription(project.description || '');
      setIcon(project.icon || '📁');
      setCoverColor(project.coverColor || COVER_COLOR_PALETTE[0]);
      setIsPublic(project.isPublic);
      setOwnerId(project.ownerId);
    }
  }, [open, project]);

  const mutation = useMutation({
    mutationFn: () =>
      updateProject(project.id, {
        description: description || undefined,
        icon,
        coverColor,
        isPublic,
        ownerId: ownerId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onOpenChange(false);
    },
  });

  const cycleCover = () => {
    const currentIndex = COVER_COLOR_PALETTE.indexOf(coverColor);
    setCoverColor(COVER_COLOR_PALETTE[(currentIndex + 1) % COVER_COLOR_PALETTE.length]);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 shadow-xl">
          <Dialog.Title className="sr-only">Editar projeto</Dialog.Title>

          <div className="relative h-32 w-full">
            <div className="absolute inset-0 overflow-hidden" style={{ background: '#020617' }}>
              <PolygonBackground color={coverColor} />
            </div>
            <Dialog.Close asChild>
              <button className="absolute right-3 top-3 text-white/80 hover:text-white">
                <X size={18} />
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={cycleCover}
              className="absolute bottom-3 right-3 rounded-md bg-black/50 px-3 py-1.5 text-xs font-medium text-white hover:bg-black/70"
            >
              Alterar capa
            </button>
            <div className="absolute -bottom-6 left-4">
              <EmojiPickerButton value={icon} onChange={setIcon} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-5 pb-5 pt-10">
            <div className="mb-3 flex items-center gap-1.5">
              <h2 className="text-lg font-semibold text-slate-100">{project.name}</h2>
              {project.key && (
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs font-medium tracking-wide text-slate-400">
                  {project.key}
                </span>
              )}
            </div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição"
              rows={3}
              className="mb-4 w-full resize-y rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
            />

            <div className="mb-5 flex flex-wrap gap-2 border-t border-slate-800 pt-4">
              <VisibilityToggle isPublic={isPublic} onChange={setIsPublic} />
              <LeadPicker value={ownerId} onChange={setOwnerId} />
            </div>

            {mutation.isError && <p className="mb-3 text-sm text-red-400">Falha ao salvar alterações.</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
