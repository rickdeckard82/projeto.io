import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listProjectStatuses } from '../../api/projects';
import { createLabel, listLabels } from '../../api/labels';
import { listUsers } from '../../api/users';
import { queryKeys } from '../../api/queryKeys';
import { useAuth } from '../../auth/AuthContext';
import { canEditItem } from '../../lib/permissions';
import { useWorkItems } from '../../hooks/useWorkItems';
import { Spinner } from '../common/Spinner';
import { Toast } from '../common/Toast';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCardPreview } from './KanbanCard';
import { ItemDetailModal } from '../items/ItemDetailModal';

function extractErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return message || fallback;
}

export function KanbanBoard({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const canCreate = user ? canEditItem(user.globalRole) : false;
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const { data: statuses, isLoading: statusesLoading } = useQuery({
    queryKey: queryKeys.projectStatuses(projectId),
    queryFn: () => listProjectStatuses(projectId),
  });

  const { data: labels } = useQuery({
    queryKey: queryKeys.projectLabels(projectId),
    queryFn: () => listLabels(projectId),
  });

  const createLabelMutation = useMutation({
    mutationFn: (data: { name: string; color: string }) => createLabel(projectId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projectLabels(projectId) }),
  });

  const { data: users } = useQuery({ queryKey: queryKeys.users, queryFn: listUsers });

  const {
    items,
    isLoading: itemsLoading,
    createItem,
    updateItem,
    updateItemStatus,
    updateItemAssignees,
    updateItemLabels,
  } = useWorkItems(projectId);

  if (statusesLoading || itemsLoading) return <Spinner />;

  const itemsById = new Map(items.map((i) => [i.id, i]));
  const activeItem = activeId ? itemsById.get(activeId) : undefined;

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const item = items.find((i) => i.id === active.id);
    if (item && item.statusId !== over.id) {
      updateItemStatus({ id: String(active.id), statusId: String(over.id) }).catch((err) =>
        setError(extractErrorMessage(err, 'Não foi possível mover o item.')),
      );
    }
  };

  return (
    <>
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="thin-scrollbar flex h-full gap-3 overflow-x-auto pb-3">
          {statuses?.map((status) => (
            <KanbanColumn
              key={status.id}
              status={status}
              items={items.filter((i) => i.statusId === status.id)}
              canCreate={canCreate}
              canEdit={canCreate}
              labels={labels || []}
              users={users || []}
              getParentTitle={(parentId) => itemsById.get(parentId)?.title}
              onOpen={setOpenItemId}
              onCreate={(title) => createItem({ title, statusId: status.id }).then(() => {})}
              onChangePriority={(id, priority) => updateItem({ id, data: { priority } })}
              onChangeAssignees={(id, userIds) => updateItemAssignees({ id, userIds })}
              onChangeLabels={(id, labelIds) => updateItemLabels({ id, labelIds })}
              onCreateLabel={(name, color) => createLabelMutation.mutateAsync({ name, color })}
            />
          ))}
        </div>
        <DragOverlay>
          {activeItem && (
            <KanbanCardPreview
              item={activeItem}
              parentTitle={activeItem.parentId ? itemsById.get(activeItem.parentId)?.title : undefined}
            />
          )}
        </DragOverlay>
      </DndContext>

      {openItemId && (
        <ItemDetailModal
          projectId={projectId}
          itemId={openItemId}
          onClose={() => setOpenItemId(null)}
          onOpenItem={setOpenItemId}
        />
      )}

      {error && <Toast message={error} onClose={() => setError(null)} />}
    </>
  );
}
