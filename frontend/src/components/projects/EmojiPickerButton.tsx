import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ICON_OPTIONS } from '../../lib/projectDefaults';

export function EmojiPickerButton({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-2xl shadow-md hover:border-indigo-500"
        >
          {value}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="grid grid-cols-8 gap-1 rounded-md border border-slate-800 bg-slate-900 p-2 shadow-xl"
        >
          {ICON_OPTIONS.map((emoji) => (
            <DropdownMenu.Item
              key={emoji}
              onSelect={() => onChange(emoji)}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-lg outline-none hover:bg-slate-800"
            >
              {emoji}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
