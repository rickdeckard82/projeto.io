import { useEffect, useState } from 'react';
import { AddQuickLinkDialog } from './AddQuickLinkDialog';

interface QuickLink {
  id: string;
  label: string;
  url: string;
}

function storageKey(userId: string) {
  return `plane-lite:quick-links:${userId}`;
}

function loadLinks(userId: string): QuickLink[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function fallbackLabel(url: string): string {
  try {
    const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(withScheme).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function QuickLinks({ userId }: { userId: string }) {
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    setLinks(loadLinks(userId));
  }, [userId]);

  const persist = (next: QuickLink[]) => {
    setLinks(next);
    localStorage.setItem(storageKey(userId), JSON.stringify(next));
  };

  const addLink = ({ url, label }: { url: string; label: string }) => {
    persist([...links, { id: crypto.randomUUID(), label: label || fallbackLabel(url), url }]);
    setDialogOpen(false);
  };

  const removeLink = (id: string) => {
    persist(links.filter((l) => l.id !== id));
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-200">Links rápidos</h2>
        <button onClick={() => setDialogOpen(true)} className="text-xs font-medium text-indigo-400 hover:text-indigo-300">
          + Adicionar link rápido
        </button>
      </div>

      {links.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 px-4 py-10 text-center">
          <p className="text-sm text-slate-400">Mantenha referências, recursos ou documentos importantes à mão</p>
          <p className="text-xs text-slate-600">para o seu trabalho</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-800 px-4 pb-3">
          {links.map((link) => (
            <li key={link.id} className="flex items-center justify-between py-2">
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="truncate text-sm text-indigo-400 hover:underline"
              >
                {link.label}
              </a>
              <button onClick={() => removeLink(link.id)} className="text-xs text-slate-500 hover:text-slate-300">
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}

      <AddQuickLinkDialog open={dialogOpen} onOpenChange={setDialogOpen} onAdd={addLink} />
    </div>
  );
}
