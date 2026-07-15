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

/**
 * Hook TanStack Query que encapsula leitura e mutações dos itens de trabalho de um projeto.
 * A query usa a chave `queryKeys.projectItems(projectId, filters)` (só roda com `projectId` definido); toda mutação (criar, atualizar, mudar status, atribuir responsáveis, atribuir labels, excluir) invalida a árvore `['projects', projectId, 'items']` no `onSuccess`, forçando um refetch da lista para refletir a mudança — independentemente do filtro ativo no momento.
 * @param projectId - id do projeto cujos itens serão listados/gerenciados
 * @param filters - filtros aplicados à listagem (status, responsável, etc.)
 * @returns itens carregados, estado de carregamento e as funções de mutação (`createItem`, `updateItem`, `updateItemStatus`, `updateItemAssignees`, `updateItemLabels`, `deleteItem`)
 */
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
