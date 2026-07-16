import { FormEvent, useState } from 'react';
import { WorkItemSummary } from '../../types';
import { Button } from '../common/Button';

export function SubItemList({
  subItems,
  canEdit,
  onCreate,
  onOpen,
}: {
  subItems: WorkItemSummary[];
  canEdit: boolean;
  onCreate: (title: string) => Promise<void>;
  onOpen: (id: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      await onCreate(title.trim());
      setTitle('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <ul className="mb-2 divide-y divide-slate-800 rounded-md border border-slate-800">
        {subItems.map((sub) => (
          <li key={sub.id}>
            <button
              onClick={() => onOpen(sub.id)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800"
            >
              <span>{sub.title}</span>
              <span className="text-xs text-slate-500">{sub.status.name}</span>
            </button>
          </li>
        ))}
        {subItems.length === 0 && <li className="px-3 py-2 text-xs text-slate-500">Sem sub-itens</li>}
      </ul>
      {canEdit && (
        <form onSubmit={submit} className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Novo sub-item"
            className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
          />
          <Button type="submit" disabled={loading} variant="secondary">
            Adicionar
          </Button>
        </form>
      )}
    </div>
  );
}
