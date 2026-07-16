import { FormEvent, useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { COVER_COLOR_PALETTE } from '../../lib/projectDefaults';
import { Button } from '../common/Button';
import { Note } from '../../types';

export function NoteDialog({
  open,
  onOpenChange,
  note,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: Note | null;
  onSubmit: (data: { content: string; color?: string }) => Promise<void>;
}) {
  const [content, setContent] = useState('');
  const [color, setColor] = useState<string>(COVER_COLOR_PALETTE[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setContent(note?.content || '');
      setColor(note?.color || COVER_COLOR_PALETTE[0]);
      setError(null);
    }
  }, [open, note]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ content: content.trim(), color });
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Não foi possível salvar a nota.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-800 bg-slate-900 p-5 shadow-xl">
          <Dialog.Title className="mb-4 text-sm font-semibold text-slate-100">
            {note ? 'Editar nota' : 'Nova nota'}
          </Dialog.Title>
          <form onSubmit={submit}>
            <textarea
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Escreva qualquer informação..."
              className="mb-3 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />

            <label className="mb-1 block text-xs text-slate-400">Cor</label>
            <div className="mb-4 flex gap-2">
              {COVER_COLOR_PALETTE.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={c}
                  className={`h-6 w-6 rounded-full border-2 ${color === c ? 'border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || !content.trim()}>
                {saving ? 'Salvando...' : note ? 'Salvar' : 'Criar nota'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
