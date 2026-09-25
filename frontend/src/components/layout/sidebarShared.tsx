import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

/** Classe dos links principais do menu lateral; recolhido, só o ícone fica visível (centralizado). */
export const sidebarLinkClass =
  (collapsed: boolean) =>
  ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-md py-2 text-sm ${collapsed ? 'justify-center px-0' : 'px-3'} ${
      isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
    }`;

/** Rótulo de seção; recolhido, vira só um divisor (o texto não caberia na faixa de ícones). */
export function SectionLabel({ children, collapsed }: { children: string; collapsed: boolean }) {
  if (collapsed) return <div className="mx-2 my-3 h-px bg-slate-800" />;
  return <p className="mb-1 mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-slate-600">{children}</p>;
}

/** Largura do `<aside>` conforme o estado recolhido/expandido. */
export const sidebarAsideClass = (collapsed: boolean) =>
  `thin-scrollbar hidden shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-slate-800 transition-[width] duration-150 ease-out sm:flex ${
    collapsed ? 'w-14' : 'w-64'
  }`;

/** Botão que recolhe o menu lateral para uma faixa só de ícones (e expande de volta). */
export function SidebarCollapseButton({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const label = collapsed ? 'Expandir menu' : 'Recolher menu';
  return (
    <div className={`mb-1 flex ${collapsed ? 'justify-center' : 'justify-end'}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={label}
        title={label}
        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-900 hover:text-slate-300"
      >
        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      </button>
    </div>
  );
}
