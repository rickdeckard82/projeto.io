import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Globe, Lock } from 'lucide-react';

export function VisibilityToggle({
  isPublic,
  onChange,
}: {
  isPublic: boolean;
  onChange: (isPublic: boolean) => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-600"
        >
          {isPublic ? <Globe size={14} /> : <Lock size={14} />}
          {isPublic ? 'Público' : 'Privado'}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="w-56 rounded-md border border-slate-800 bg-slate-900 p-1 shadow-xl"
        >
          <DropdownMenu.Item
            onSelect={() => onChange(false)}
            className="flex cursor-pointer flex-col gap-0.5 rounded px-2 py-1.5 outline-none hover:bg-slate-800"
          >
            <span className="flex items-center gap-2 text-sm text-slate-100">
              <Lock size={14} /> Privado
            </span>
            <span className="pl-5 text-[11px] text-slate-500">Somente membros do projeto podem ver</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => onChange(true)}
            className="flex cursor-pointer flex-col gap-0.5 rounded px-2 py-1.5 outline-none hover:bg-slate-800"
          >
            <span className="flex items-center gap-2 text-sm text-slate-100">
              <Globe size={14} /> Público
            </span>
            <span className="pl-5 text-[11px] text-slate-500">Qualquer pessoa da organização pode visualizar</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
