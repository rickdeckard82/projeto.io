import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import { formatDateTime } from '../../lib/dateFormat';
import { AppNotification } from '../../types';

const TYPE_LABEL: Record<AppNotification['type'], string> = {
  TASK_DUE_SOON: 'Vencimento próximo',
  TASK_OVERDUE: 'Tarefa atrasada',
  TASK_ASSIGNED: 'Nova atribuição',
};

/** Sino de notificações no topo, perto do nome do usuário — badge com não lidas, lista das últimas notificações, atualizado em tempo real (ver `useNotifications`). */
export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  const onSelectNotification = (notification: AppNotification) => {
    if (!notification.readAt) {
      markRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded-md text-slate-400 outline-none hover:bg-slate-800 hover:text-slate-200"
          aria-label="Notificações"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="thin-scrollbar max-h-96 w-80 overflow-y-auto rounded-md border border-slate-800 bg-slate-900 py-1 shadow-xl"
        >
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs font-semibold text-slate-300">Notificações</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-slate-800" />

          {notifications.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-slate-500">Nenhuma notificação por aqui</p>
          )}

          {notifications.map((notification) => (
            <DropdownMenu.Item
              key={notification.id}
              onSelect={() => onSelectNotification(notification)}
              className="flex cursor-pointer flex-col gap-0.5 px-3 py-2 text-sm outline-none hover:bg-slate-800"
            >
              <div className="flex items-center gap-2">
                {!notification.readAt && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />}
                <span className="truncate text-slate-100">{notification.title}</span>
              </div>
              <span className="text-xs text-slate-500">
                {TYPE_LABEL[notification.type]} · {formatDateTime(notification.createdAt, user?.timezone)}
              </span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
