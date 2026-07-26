import { useEffect, useRef, useState } from 'react';
import { Check, MoreHorizontal } from 'lucide-react';

export type ProjectFilter = 'all' | 'mine' | 'member';

const PROJECT_FILTER_OPTIONS: { value: ProjectFilter; label: string }[] = [
  { value: 'all', label: 'Todos os projetos' },
  { value: 'mine', label: 'Meus projetos' },
  { value: 'member', label: 'Projetos em que participo' },
];

/**
 * Botão "..." que abre um menu para filtrar uma lista de projetos entre os do próprio usuário
 * (dono) e os dos quais ele só participa (membro, não dono). Filtro é só client-side sobre a
 * lista já carregada — não dispara nova query.
 * @param align - de que lado o botão ancora o menu (abrindo para o lado oposto); `"left"`
 * (padrão) funciona quando há espaço à direita do botão (ex.: início de uma página), `"right"`
 * quando o botão fica perto da borda direita de um container estreito (ex.: a sidebar) — os dois
 * containers onde esse menu é usado hoje têm `overflow` que corta o menu se ele vazar para o lado
 * errado, então o lado precisa ser escolhido por quem usa o componente.
 */
export function ProjectFilterMenu({
  value,
  onChange,
  align = 'left',
}: {
  value: ProjectFilter;
  onChange: (value: ProjectFilter) => void;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Filtrar projetos"
        className="rounded p-1 text-slate-500 hover:bg-slate-900 hover:text-slate-300"
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div
          className={`absolute top-6 z-10 w-48 rounded-md border border-slate-800 bg-slate-900 py-1 shadow-lg ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {PROJECT_FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-800"
            >
              <Check size={12} className={value === option.value ? 'text-indigo-400' : 'text-transparent'} />
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function filterProjectsByOwnership<T extends { ownerId: string }>(
  projects: T[] | undefined,
  filter: ProjectFilter,
  userId: string | undefined,
): T[] | undefined {
  return projects?.filter((project) => {
    if (filter === 'mine') return project.ownerId === userId;
    if (filter === 'member') return project.ownerId !== userId;
    return true;
  });
}
