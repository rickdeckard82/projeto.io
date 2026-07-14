import { useQuery } from '@tanstack/react-query';
import { listUsers } from '../../api/users';
import { queryKeys } from '../../api/queryKeys';

export function AssigneePicker({
  selectedUserIds,
  onChange,
  disabled,
}: {
  selectedUserIds: string[];
  onChange: (userIds: string[]) => void;
  disabled?: boolean;
}) {
  const { data: users } = useQuery({ queryKey: queryKeys.users, queryFn: listUsers });

  const toggle = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      onChange(selectedUserIds.filter((id) => id !== userId));
    } else {
      onChange([...selectedUserIds, userId]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {users?.map((u) => (
        <label
          key={u.id}
          className={`flex cursor-pointer items-center gap-1 rounded-full border px-2 py-1 text-xs ${
            selectedUserIds.includes(u.id)
              ? 'border-indigo-500 bg-indigo-950 text-indigo-200'
              : 'border-slate-700 text-slate-400'
          }`}
        >
          <input
            type="checkbox"
            className="hidden"
            disabled={disabled}
            checked={selectedUserIds.includes(u.id)}
            onChange={() => toggle(u.id)}
          />
          {u.fullName}
        </label>
      ))}
    </div>
  );
}
