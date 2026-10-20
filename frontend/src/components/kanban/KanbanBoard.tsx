import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listProjectMembers, listProjectStatuses } from '../../api/projects';
import { createLabel, listLabels } from '../../api/labels';
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

export function KanbanBoard({ projectId, moduleId }: { projectId: string; moduleId?: string }) {
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
    queryKey: queryKeys.labels,
    queryFn: listLabels,
  });

  const createLabelMutation = useMutation({
    mutationFn: createLabel,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.labels }),
  });

  // Só membros do projeto podem ser responsáveis por um item dele — mesmo escopo de `AssigneePicker`.
  const { data: members } = useQuery({
    queryKey: queryKeys.projectMembers(projectId),
    queryFn: () => listProjectMembers(projectId),
  });
  const users = members?.map((m) => ({ id: m.user.id, fullName: m.user.fullName, avatarUrl: m.user.avatarUrl ?? null }));

  const {
    items,
    isLoading: itemsLoading,
    createItem,
    updateItem,
    updateItemStatus,
    updateItemAssignees,
    updateItemLabels,
  } = useWorkItems(projectId, { moduleId });

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
              currentUserId={user?.id}
              isAdmin={user?.globalRole === 'ADMIN'}
              labels={labels || []}
              users={users || []}
              getParentTitle={(parentId) => itemsById.get(parentId)?.title}
              onOpen={setOpenItemId}
              onCreate={(title) =>
                createItem({ title, statusId: status.id, moduleId })
                  .then(() => {})
                  .catch((err) => setError(extractErrorMessage(err, 'Não foi possível criar o item.')))
              }
              onChangePriority={(id, priority) =>
                updateItem({ id, data: { priority } }).catch((err) =>
                  setError(extractErrorMessage(err, 'Não foi possível alterar a prioridade.')),
                )
              }
              onChangeAssignees={(id, userIds) =>
                updateItemAssignees({ id, userIds }).catch((err) =>
                  setError(extractErrorMessage(err, 'Não foi possível alterar os responsáveis.')),
                )
              }
              onChangeLabels={(id, labelIds) =>
                updateItemLabels({ id, labelIds }).catch((err) =>
                  setError(extractErrorMessage(err, 'Não foi possível alterar as etiquetas.')),
                )
              }
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
