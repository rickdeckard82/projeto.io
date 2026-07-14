import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import { createDocument, deleteDocument, listDocuments, updateDocument } from '../api/documents';

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
