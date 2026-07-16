import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ProjectDocument } from '../../types';
import { Button } from '../common/Button';

export function DocumentEditor({
  document,
  editable,
  onSave,
  onDelete,
}: {
  document: ProjectDocument;
  editable: boolean;
  onSave: (data: { title: string; content: string }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [title, setTitle] = useState(document.title);
  const [content, setContent] = useState(document.content);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setTitle(document.title);
    setContent(document.content);
  }, [document.id]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await onSave({ title, content });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // erro já é exibido pela página (Toast) — aqui só evita marcar como salvo
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <input
          value={title}
          disabled={!editable}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={save}
          className="flex-1 bg-transparent text-lg font-semibold text-slate-100 outline-none disabled:opacity-70"
        />
        {editable && (
          <div className="flex items-center gap-2">
            {saved && <span className="text-xs text-green-400">Salvo</span>}
            <Button variant="secondary" disabled={saving} onClick={save}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button variant="danger" onClick={onDelete}>
              Excluir
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <textarea
          value={content}
          disabled={!editable}
          onChange={(e) => setContent(e.target.value)}
          onBlur={save}
          rows={20}
          placeholder="Escreva em markdown..."
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:opacity-70"
        />
        <div className="markdown-preview max-w-none rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200">
          <ReactMarkdown>{content || '*Sem conteúdo*'}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
