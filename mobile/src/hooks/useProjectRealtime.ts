import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import { getSocket, joinProject, leaveProject } from '../lib/realtime';

/**
 * Ouve a sala do projeto e invalida as queries afetadas, igual ao web (`useWorkItems` /
 * `ActivityFeed` / `ProjectDetailLayout`): o payload dos eventos é mínimo (só ids), então o
 * cliente refaz a busca em vez de tentar reconciliar estado parcial.
 */
export function useProjectRealtime(projectId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;
    const socket = getSocket();
    joinProject(projectId);

    const onItemsChanged = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.items(projectId) });
      // O detalhe aberto de qualquer item deste projeto também pode ter mudado.
      queryClient.invalidateQueries({ queryKey: ['item'], predicate: (q) => q.queryKey.length === 2 });
    };
    const onActivityChanged = ({ workItemId }: { workItemId: string }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.itemActivities(workItemId) });
    };
    const onProjectChanged = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    };

    socket?.on('items:changed', onItemsChanged);
    socket?.on('activity:changed', onActivityChanged);
    socket?.on('project:changed', onProjectChanged);
    return () => {
      socket?.off('items:changed', onItemsChanged);
      socket?.off('activity:changed', onActivityChanged);
      socket?.off('project:changed', onProjectChanged);
      leaveProject(projectId);
    };
  }, [projectId, queryClient]);
}
