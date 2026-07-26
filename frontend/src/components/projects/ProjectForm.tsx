import { FormEvent, useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { CreateProjectInput } from '../../api/projects';
import { useAuth } from '../../auth/AuthContext';
import { COVER_COLOR_PALETTE, ICON_OPTIONS, suggestProjectKey } from '../../lib/projectDefaults';
import { Button } from '../common/Button';
import { PolygonBackground } from '../common/PolygonBackground';
import { EmojiPickerButton } from './EmojiPickerButton';
import { VisibilityToggle } from './VisibilityToggle';
import { LeadPicker } from './LeadPicker';

export function ProjectForm({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateProjectInput) => Promise<void>;
}) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [keyEdited, setKeyEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const [coverColor, setCoverColor] = useState(COVER_COLOR_PALETTE[0]);
  const [isPublic, setIsPublic] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      setOwnerId(user.id);
    }
  }, [open, user]);

  useEffect(() => {
    if (!keyEdited) {
      setKey(suggestProjectKey(name));
    }
  }, [name, keyEdited]);

  const reset = () => {
    setName('');
    setKey('');
    setKeyEdited(false);
    setDescription('');
    setIcon(ICON_OPTIONS[0]);
    setCoverColor(COVER_COLOR_PALETTE[0]);
    setIsPublic(false);
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const cycleCover = () => {
    const currentIndex = COVER_COLOR_PALETTE.indexOf(coverColor);
    setCoverColor(COVER_COLOR_PALETTE[(currentIndex + 1) % COVER_COLOR_PALETTE.length]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        description: description || undefined,
        // Só manda a key quando o usuário editou o campo à mão — a sugestão automática (a partir
        // do nome) não é enviada, para o backend poder desambiguar sozinho com sufixo numérico em
        // caso de colisão (ver resolveProjectKey) em vez de tratar como escolha explícita e barrar.
        key: keyEdited ? key || undefined : undefined,
        icon,
        coverColor,
        isPublic,
        ownerId: ownerId || undefined,
      });
      reset();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Não foi possível criar o projeto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 shadow-xl">
          <Dialog.Title className="sr-only">Criar novo projeto</Dialog.Title>

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
            <div className="mb-4 flex gap-3">
              <input
                autoFocus
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do projeto"
                className="flex-1 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-lg font-medium text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
              />
              <div className="w-32 shrink-0">
                <input
                  value={key}
                  onChange={(e) => {
                    setKeyEdited(true);
                    setKey(e.target.value.toUpperCase().slice(0, 8));
                  }}
                  title="Identificador curto e único do projeto"
                  placeholder="ID do projeto"
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm uppercase text-slate-200 placeholder:normal-case placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>
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

            <div className="flex items-center justify-end gap-2">
              {error && <p className="mr-auto text-xs text-red-400">{error}</p>}
              <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Criando...' : 'Criar projeto'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
