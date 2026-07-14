import { useQuery } from '@tanstack/react-query';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { UserRound } from 'lucide-react';
import { listUsers } from '../../api/users';
import { queryKeys } from '../../api/queryKeys';
import { Avatar } from '../common/Avatar';

export function LeadPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (userId: string) => void;
}) {
  const { data: users } = useQuery({ queryKey: queryKeys.users, queryFn: listUsers });
  const selected = users?.find((u) => u.id === value);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-600"
        >
          {selected ? <Avatar name={selected.fullName} /> : <UserRound size={14} />}
          {selected ? selected.fullName : 'Líder'}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="max-h-64 w-56 overflow-y-auto rounded-md border border-slate-800 bg-slate-900 p-1 shadow-xl"
        >
          {users?.map((u) => (
            <DropdownMenu.Item
              key={u.id}
              onSelect={() => onChange(u.id)}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-100 outline-none hover:bg-slate-800"
            >
              <Avatar name={u.fullName} />
              {u.fullName}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
