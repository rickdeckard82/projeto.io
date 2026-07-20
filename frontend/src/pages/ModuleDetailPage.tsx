import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Boxes } from 'lucide-react';
import { getModule } from '../api/modules';
import { queryKeys } from '../api/queryKeys';
import { Spinner } from '../components/common/Spinner';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { ItemListTable } from '../components/items/ItemListTable';

const tabs = [
  { key: 'board', label: 'Quadro' },
  { key: 'list', label: 'Lista' },
] as const;

/**
 * Visão de um módulo: mesmas colunas de status do projeto (o módulo não tem kanban próprio), só
 * que board/lista mostram apenas os itens deste módulo (`WorkItem.moduleId`). Itens criados aqui
 * já nascem vinculados ao módulo.
 */
export function ModuleDetailPage() {
  const { projectId, moduleId } = useParams<{ projectId: string; moduleId: string }>();
  const [view, setView] = useState<(typeof tabs)[number]['key']>('board');

  const { data: module, isLoading } = useQuery({
    queryKey: queryKeys.module(moduleId!),
    queryFn: () => getModule(moduleId!),
    enabled: !!moduleId,
  });

  if (!projectId || !moduleId) return null;
  if (isLoading) return <Spinner />;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-1 flex items-center gap-2">
        <Boxes size={18} className="text-slate-400" />
        <h1 className="text-lg font-semibold text-slate-100">{module?.name}</h1>
      </div>
      {module?.description && <p className="mb-4 text-sm text-slate-400">{module.description}</p>}

      <div className="mb-6 flex gap-1 border-b border-slate-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            className={`px-3 py-2 text-sm ${
              view === tab.key ? 'border-b-2 border-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto">
        {view === 'board' ? (
          <KanbanBoard projectId={projectId} moduleId={moduleId} />
        ) : (
          <ItemListTable projectId={projectId} moduleId={moduleId} />
        )}
      </div>
    </div>
  );
}
