import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ProjectMember } from '../../types';
import { removeProjectMember } from '../../api/projects';
import { queryKeys } from '../../api/queryKeys';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';

export function MemberList({ projectId, members }: { projectId: string; members: ProjectMember[] }) {
  const queryClient = useQueryClient();
  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeProjectMember(projectId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projectMembers(projectId) }),
  });

  return (
    <ul className="divide-y divide-slate-800 rounded-md border border-slate-800">
      {members.map((member) => (
        <li key={member.id} className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <Avatar name={member.user.fullName} src={member.user.avatarUrl} email={member.user.email} />
            <div>
              <p className="text-sm text-slate-200">{member.user.fullName}</p>
              <p className="text-xs text-slate-500">
                {member.user.email} · {member.user.globalRole}
              </p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => removeMutation.mutate(member.userId)}>
            Remover
          </Button>
        </li>
      ))}
    </ul>
  );
}
