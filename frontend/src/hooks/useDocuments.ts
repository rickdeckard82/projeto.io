import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import { createDocument, deleteDocument, listDocuments, updateDocument } from '../api/documents';

/**
 * Hook TanStack Query que encapsula leitura e mutações dos documentos (páginas markdown) de um projeto.
 * A query usa a chave `queryKeys.projectDocuments(projectId)` (só roda com `projectId` definido); toda mutação (criar, atualizar, excluir) invalida essa mesma chave no `onSuccess`, forçando um refetch da lista de documentos.
 * @param projectId - id do projeto cujos documentos serão listados/gerenciados
 * @returns documentos carregados, estado de carregamento e as funções de mutação (`createDocument`, `updateDocument`, `deleteDocument`)
 */
export function useDocuments(projectId: string) {
  const queryClient = useQueryClient();

  const documentsQuery = useQuery({
    queryKey: queryKeys.projectDocuments(projectId),
    queryFn: () => listDocuments(projectId),
    enabled: !!projectId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.projectDocuments(projectId) });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; content?: string }) => createDocument(projectId, data),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title?: string; content?: string } }) => updateDocument(id, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: invalidate,
  });

  return {
    documents: documentsQuery.data || [],
    isLoading: documentsQuery.isLoading,
    createDocument: createMutation.mutateAsync,
    updateDocument: updateMutation.mutateAsync,
    deleteDocument: deleteMutation.mutateAsync,
  };
}
