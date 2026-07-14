import { FormEvent, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '../common/Button';

export function AddQuickLinkDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: { url: string; label: string }) => void;
}) {
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');

  const reset = () => {
    setUrl('');
    setLabel('');
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    onAdd({ url: url.trim(), label: label.trim() });
    reset();
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-800 bg-slate-900 p-5 shadow-xl">
          <Dialog.Title className="mb-4 text-base font-semibold text-slate-100">Adicionar Link rápido</Dialog.Title>

          <form onSubmit={submit}>
            <div className="mb-4">
              <div className="mb-1 flex items-baseline gap-2">
                <label className="text-sm font-medium text-slate-200">URL</label>
                <span className="text-xs text-slate-500">Obrigatório</span>
              </div>
              <input
                autoFocus
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Digite ou cole um URL"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
              />
            </div>

            <div className="mb-2">
              <div className="mb-1 flex items-baseline gap-2">
                <label className="text-sm font-medium text-slate-200">Título de exibição</label>
                <span className="text-xs text-slate-500">Opcional</span>
              </div>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Como você gostaria de ver este link"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2 border-t border-slate-800 pt-4">
              <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">Adicionar Link Rápido</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
