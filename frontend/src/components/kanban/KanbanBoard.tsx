import { useState } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { useQuery } from '@tanstack/react-query';
import { listProjectStatuses } from '../../api/projects';
import { queryKeys } from '../../api/queryKeys';
import { useAuth } from '../../auth/AuthContext';
import { canEditItem } from '../../lib/permissions';
import { useWorkItems } from '../../hooks/useWorkItems';
import { Spinner } from '../common/Spinner';
import { KanbanColumn } from './KanbanColumn';
import { ItemDetailModal } from '../items/ItemDetailModal';

export function KanbanBoard({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const canCreate = user ? canEditItem(user.globalRole) : false;
  const [openItemId, setOpenItemId] = useState<string | null>(null);

  const { data: statuses, isLoading: statusesLoading } = useQuery({
    queryKey: queryKeys.projectStatuses(projectId),
    queryFn: () => listProjectStatuses(projectId),
  });

  const { items, isLoading: itemsLoading, createItem, updateItemStatus } = useWorkItems(projectId, {
    parentId: 'null',
  });

  if (statusesLoading || itemsLoading) return <Spinner />;

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const item = items.find((i) => i.id === active.id);
    if (item && item.statusId !== over.id) {
      updateItemStatus({ id: String(active.id), statusId: String(over.id) });
    }
  };

  return (
    <>
      <DndContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {statuses?.map((status) => (
            <KanbanColumn
              key={status.id}
              status={status}
              items={items.filter((i) => i.statusId === status.id)}
              canCreate={canCreate}
              onOpen={setOpenItemId}
              onCreate={(title) => createItem({ title, statusId: status.id }).then(() => {})}
            />
          ))}
        </div>
      </DndContext>

      {openItemId && (
        <ItemDetailModal
          projectId={projectId}
          itemId={openItemId}
          onClose={() => setOpenItemId(null)}
          onOpenItem={setOpenItemId}
        />
      )}
    </>
  );
}
