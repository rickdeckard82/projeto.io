import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Module } from '../../types';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';

export function ModuleList({
  modules,
  onEdit,
  onDelete,
}: {
  modules: Module[];
  onEdit: (module: Module) => void;
  onDelete: (module: Module) => Promise<void>;
}) {
  const [deleteTarget, setDeleteTarget] = useState<Module | null>(null);

  return (
    <>
      <ul className="divide-y divide-slate-800 rounded-md border border-slate-800">
        {modules.map((moduleItem) => (
          <li key={moduleItem.id} className="flex items-center justify-between px-3 py-2">
            <div>
              <p className="text-sm text-slate-200">{moduleItem.name}</p>
              {moduleItem.description && <p className="text-xs text-slate-500">{moduleItem.description}</p>}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" onClick={() => onEdit(moduleItem)} aria-label="Editar módulo">
                <Pencil size={14} />
              </Button>
              <Button variant="ghost" onClick={() => setDeleteTarget(moduleItem)} aria-label="Excluir módulo">
                <Trash2 size={14} />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir módulo"
        description="Os itens deste módulo não são apagados — só deixam de pertencer a ele."
        confirmLabel="Excluir"
        onConfirm={() => deleteTarget && onDelete(deleteTarget).then(() => setDeleteTarget(null))}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
