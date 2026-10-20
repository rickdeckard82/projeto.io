import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, Tag, Trash2, X } from 'lucide-react';
import { createLabel, deleteLabel, listLabels, updateLabel } from '../api/labels';
import { queryKeys } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { Spinner } from '../components/common/Spinner';
import { COVER_COLOR_PALETTE } from '../lib/projectDefaults';
import { Label } from '../types';

const inputClass = 'rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100';

function apiError(err: any, fallback: string): string {
  const message = err?.response?.data?.message;
  return Array.isArray(message) ? message.join(' ') : message || fallback;
}

function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {COVER_COLOR_PALETTE.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`Cor ${color}`}
          onClick={() => onChange(color)}
          className={`h-5 w-5 rounded-full ${value === color ? 'ring-2 ring-slate-300 ring-offset-2 ring-offset-slate-900' : ''}`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

function LabelRow({ label, canManage, onDelete }: { label: Label; canManage: boolean; onDelete: () => void }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(label.name);
  const [color, setColor] = useState(label.color);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => updateLabel(label.id, { name: name.trim(), color }),
    onSuccess: () => {
      // Itens em cache trazem nome/cor da etiqueta embutidos — recarrega tudo que é de projeto.
      queryClient.invalidateQueries({ queryKey: queryKeys.labels });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'recent-items'] });
      setEditing(false);
      setError(null);
    },
    onError: (err) => setError(apiError(err, 'Falha ao salvar a etiqueta')),
  });

  const cancel = () => {
    setEditing(false);
    setName(label.name);
    setColor(label.color);
    setError(null);
  };

  const usage = `${label.itemCount ?? 0} ${label.itemCount === 1 ? 'item' : 'itens'}`;

  if (editing) {
    return (
      <form
        className="flex flex-col gap-2 rounded-lg border border-indigo-700/60 bg-slate-900 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) mutation.mutate();
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <input
            autoFocus
            required
            maxLength={50}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && cancel()}
            className={`min-w-0 flex-1 ${inputClass}`}
          />
          <Button type="submit" disabled={mutation.isPending || !name.trim()} title="Salvar">
            <Check size={14} />
          </Button>
          <Button type="button" variant="ghost" onClick={cancel} title="Cancelar">
            <X size={14} />
          </Button>
        </div>
        <ColorPicker value={color} onChange={setColor} />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5">
      <Badge color={label.color}>{label.name}</Badge>
      <span className="text-xs text-slate-500">{usage}</span>
      {canManage && (
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" onClick={() => setEditing(true)} title="Editar" aria-label={`Editar ${label.name}`}>
            <Pencil size={14} />
          </Button>
          <Button variant="ghost" onClick={onDelete} title="Excluir" aria-label={`Excluir ${label.name}`}>
            <Trash2 size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Gestão das etiquetas globais (Espaço de trabalho > Etiquetas). A mesma lista aparece em todos
 * os projetos. Admin/Senior/Membro criam; renomear, trocar a cor e excluir (que afetam os itens
 * de todos os projetos) ficam com Admin/Senior — mesma regra do backend.
 */
export function LabelsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: labels, isLoading } = useQuery({ queryKey: queryKeys.labels, queryFn: listLabels });

  const [name, setName] = useState('');
  const [color, setColor] = useState(COVER_COLOR_PALETTE[0]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Label | null>(null);

  const canCreate = !!user && user.globalRole !== 'VIEWER';
  const canManage = !!user && (user.globalRole === 'ADMIN' || user.globalRole === 'SENIOR');

  const createMutation = useMutation({
    mutationFn: () => createLabel({ name: name.trim(), color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.labels });
      setName('');
      setError(null);
    },
    onError: (err) => setError(apiError(err, 'Falha ao criar a etiqueta')),
  });

  const deleteMutation = useMutation({
    mutationFn: (labelId: string) => deleteLabel(labelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.labels });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'recent-items'] });
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) createMutation.mutate();
  };

  const term = search.trim().toLowerCase();
  const visible = labels?.filter((label) => !term || label.name.toLowerCase().includes(term));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-2 flex items-center gap-2">
        <Tag size={18} className="text-slate-400" />
        <h1 className="text-lg font-semibold text-slate-100">Etiquetas</h1>
      </div>
      <p className="mb-6 text-xs text-slate-500">
        As etiquetas são globais: a mesma lista aparece em todos os projetos, no quadro e no detalhe dos itens.
      </p>

      {canCreate && (
        <form onSubmit={onSubmit} className="mb-6 flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <div className="flex flex-wrap gap-2">
            <input
              placeholder="Nova etiqueta"
              maxLength={50}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`min-w-0 flex-1 ${inputClass}`}
            />
            <Button type="submit" disabled={createMutation.isPending || !name.trim()}>
              {createMutation.isPending ? 'Criando...' : 'Criar'}
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <ColorPicker value={color} onChange={setColor} />
            {name.trim() && <Badge color={color}>{name.trim()}</Badge>}
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </form>
      )}

      {isLoading && <Spinner />}

      {!isLoading && labels?.length === 0 && (
        <EmptyState title="Nenhuma etiqueta criada" description="Crie a primeira acima; ela fica disponível em todos os projetos." />
      )}

      {!!labels?.length && (
        <>
          {labels.length > 8 && (
            <input
              placeholder="Buscar etiqueta"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`mb-3 w-full ${inputClass}`}
            />
          )}
          <div className="flex flex-col gap-2">
            {visible?.map((label) => (
              <LabelRow key={label.id} label={label} canManage={canManage} onDelete={() => setToDelete(label)} />
            ))}
            {visible?.length === 0 && <p className="text-xs text-slate-500">Nenhuma etiqueta encontrada.</p>}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title={`Excluir a etiqueta "${toDelete?.name}"?`}
        description={
          toDelete?.itemCount
            ? `Ela será removida de ${toDelete.itemCount} ${toDelete.itemCount === 1 ? 'item' : 'itens'}, em todos os projetos. Os itens não são apagados.`
            : 'Nenhum item usa esta etiqueta.'
        }
        confirmLabel="Excluir"
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteMutation.mutate(toDelete.id);
          setToDelete(null);
        }}
      />
    </div>
  );
}
