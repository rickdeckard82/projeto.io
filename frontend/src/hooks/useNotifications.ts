import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import { socket } from '../lib/socket';
import {
  clearAllNotifications,
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications';

/**
 * Hook TanStack Query do sino de notificações: lista + contagem de não lidas, atualizadas em
 * tempo real via `RealtimeGateway` (sala pessoal `user:<id>`, entrada automática na conexão do
 * socket — sem `join-*`/`leave-*` explícito, ao contrário de `useWorkItems`).
 */
export function useNotifications() {
  const queryClient = useQueryClient();

  const unreadQuery = useQuery({ queryKey: queryKeys.notificationsUnreadCount, queryFn: getUnreadCount });
  const listQuery = useQuery({ queryKey: queryKeys.notifications(), queryFn: () => listNotifications() });

  useEffect(() => {
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnreadCount });
    };
    const onUnreadCount = (payload: { count: number }) => {
      queryClient.setQueryData(queryKeys.notificationsUnreadCount, { count: payload.count });
    };

    socket.on('notification:created', invalidate);
    socket.on('notification:unread-count', onUnreadCount);
    return () => {
      socket.off('notification:created', invalidate);
      socket.off('notification:unread-count', onUnreadCount);
    };
  }, [queryClient]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
    queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnreadCount });
  };

  const markReadMutation = useMutation({ mutationFn: markNotificationRead, onSuccess: invalidateAll });
  const markAllReadMutation = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: invalidateAll });
  const clearAllMutation = useMutation({ mutationFn: clearAllNotifications, onSuccess: invalidateAll });

  return {
    notifications: listQuery.data?.items || [],
    unreadCount: unreadQuery.data?.count || 0,
    isLoading: listQuery.isLoading,
    markRead: markReadMutation.mutateAsync,
    markAllRead: markAllReadMutation.mutateAsync,
    clearAll: clearAllMutation.mutateAsync,
  };
}
