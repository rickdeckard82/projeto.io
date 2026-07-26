import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Flag,
  MessageSquare,
  Pencil,
  Plus,
  Repeat,
  Sparkles,
  Tag,
  Text,
  UserMinus,
  UserPlus as UserPlusIcon,
  Workflow,
} from 'lucide-react';
import { addItemComment, getItemActivities } from '../../api/workItems';
import { queryKeys } from '../../api/queryKeys';
import { socket } from '../../lib/socket';
import { ItemActivity, Priority } from '../../types';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { relativeTime } from '../../lib/relativeTime';
import { priorityLabel } from './PrioritySelect';

const ACTIVITY_ICON: Record<ItemActivity['type'], typeof Plus> = {
  CREATED: Sparkles,
  TITLE_CHANGED: Pencil,
  DESCRIPTION_CHANGED: Text,
  STATUS_CHANGED: Workflow,
  PRIORITY_CHANGED: Flag,
  LABEL_ADDED: Tag,
  LABEL_REMOVED: Tag,
  ASSIGNEE_ADDED: UserPlusIcon,
  ASSIGNEE_REMOVED: UserMinus,
  COMMENT: MessageSquare,
  RECURRENCE_GENERATED: Repeat,
};

function describeActivity(activity: ItemActivity): string {
  const meta = activity.metadata || {};
  switch (activity.type) {
    case 'CREATED':
      return 'criou o item';
    case 'TITLE_CHANGED':
      return `alterou o título para "${meta.to}"`;
    case 'DESCRIPTION_CHANGED':
      return 'atualizou a descrição';
    case 'STATUS_CHANGED':
      return `moveu de "${meta.from}" para "${meta.to}"`;
    case 'PRIORITY_CHANGED':
      return `alterou a prioridade de ${priorityLabel((meta.from || 'NONE') as Priority)} para ${priorityLabel(
        (meta.to || 'NONE') as Priority,
      )}`;
    case 'LABEL_ADDED':
      return `adicionou a etiqueta "${meta.name}"`;
    case 'LABEL_REMOVED':
      return `removeu a etiqueta "${meta.name}"`;
    case 'ASSIGNEE_ADDED':
      return `adicionou ${meta.userName} como responsável`;
    case 'ASSIGNEE_REMOVED':
      return `removeu ${meta.userName} dos responsáveis`;
    case 'COMMENT':
      return 'comentou';
    case 'RECURRENCE_GENERATED':
      return `gerou a próxima ocorrência: "${meta.newItemTitle}"`;
    default:
      return '';
  }
}

export function ActivityFeed({ itemId, canComment }: { itemId: string; canComment: boolean }) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');

  const { data: activities, isLoading } = useQuery({
    queryKey: queryKeys.itemActivities(itemId),
    queryFn: () => getItemActivities(itemId),
  });

  // Tempo real: já entrou na sala do projeto via useWorkItems (mesma página); só falta ouvir o
  // evento de atividade e refazer a busca quando for deste item especificamente.
  useEffect(() => {
    const onActivityChanged = (payload: { workItemId: string }) => {
      if (payload.workItemId === itemId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.itemActivities(itemId) });
      }
    };
    socket.on('activity:changed', onActivityChanged);
    return () => {
      socket.off('activity:changed', onActivityChanged);
    };
  }, [itemId, queryClient]);

  const commentMutation = useMutation({
    mutationFn: (message: string) => addItemComment(itemId, message),
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: queryKeys.itemActivities(itemId) });
    },
  });

  const submitComment = () => {
    if (!comment.trim()) return;
    commentMutation.mutate(comment.trim());
  };

  return (
    <div>
      <ul className="flex flex-col gap-3">
        {activities?.map((activity) => {
          const Icon = ACTIVITY_ICON[activity.type];
          return (
            <li key={activity.id} className="flex items-start gap-2">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-400">
                <Icon size={12} />
              </span>
              <div className="min-w-0 flex-1">
                {activity.type === 'COMMENT' ? (
                  <div className="rounded-md border border-slate-800 bg-slate-950 p-2">
                    <div className="mb-1 flex items-center gap-1.5 text-xs">
                      <Avatar name={activity.user.fullName} src={activity.user.avatarUrl} size={16} />
                      <span className="font-medium text-slate-200">{activity.user.fullName}</span>
                      <span className="text-slate-500">{relativeTime(activity.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-slate-100">{activity.message}</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    <span className="font-medium text-slate-200">{activity.user.fullName}</span>{' '}
                    {describeActivity(activity)} <span className="text-slate-600">· {relativeTime(activity.createdAt)}</span>
                  </p>
                )}
              </div>
            </li>
          );
        })}
        {!isLoading && activities?.length === 0 && (
          <li className="text-xs text-slate-500">Nenhuma atividade ainda.</li>
        )}
      </ul>

      {canComment && (
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Adicionar comentário"
            rows={2}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <div className="flex justify-end">
            <Button onClick={submitComment} disabled={!comment.trim() || commentMutation.isPending}>
              Comentário
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
