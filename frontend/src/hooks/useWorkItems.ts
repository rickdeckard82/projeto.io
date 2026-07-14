import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import {
  createItem,
  CreateItemInput,
  deleteItem,
  ItemFilters,
  listItems,
  updateItem,
  updateItemAssignees,
  updateItemLabels,
  updateItemStatus,
} from '../api/workItems';

export function useWorkItems(projectId: string, filters: ItemFilters = {}) {
  const queryClient = useQueryClient();
  const key = queryKeys.projectItems(projectId, filters as Record<string, string | undefined>);

  const itemsQuery = useQuery({
    queryKey: key,
    queryFn: () => listItems(projectId, filters),
    enabled: !!projectId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'items'] });

  const createMutation = useMutation({
    mutationFn: (data: CreateItemInput) => createItem(projectId, data),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateItemInput> }) => updateItem(id, data),
    onSuccess: invalidate,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, statusId }: { id: string; statusId: string }) => updateItemStatus(id, statusId),
    onSuccess: invalidate,
  });

  const updateAssigneesMutation = useMutation({
    mutationFn: ({ id, userIds }: { id: string; userIds: string[] }) => updateItemAssignees(id, userIds),
    onSuccess: invalidate,
  });

  const updateLabelsMutation = useMutation({
    mutationFn: ({ id, labelIds }: { id: string; labelIds: string[] }) => updateItemLabels(id, labelIds),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteItem(id),
    onSuccess: invalidate,
  });

  return {
    items: itemsQuery.data || [],
    isLoading: itemsQuery.isLoading,
    createItem: createMutation.mutateAsync,
    updateItem: updateMutation.mutateAsync,
    updateItemStatus: updateStatusMutation.mutateAsync,
    updateItemAssignees: updateAssigneesMutation.mutateAsync,
    updateItemLabels: updateLabelsMutation.mutateAsync,
    deleteItem: deleteMutation.mutateAsync,
  };
}
