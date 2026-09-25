import { Link } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import logo from '../../assets/projeto-io-logo.svg';
import icon from '../../assets/projeto-io-icon.svg';

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

/** `<aside>` em altura total (vai até o topo da tela); largura conforme o estado recolhido/expandido. */
export const sidebarAsideClass = (collapsed: boolean) =>
  `hidden shrink-0 flex-col overflow-hidden border-r border-slate-800 transition-[width] duration-150 ease-out sm:flex ${
    collapsed ? 'w-14' : 'w-64'
  }`;

/** `<nav>` rolável abaixo do logo. */
export const sidebarNavClass = (collapsed: boolean) =>
  `thin-scrollbar flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden ${collapsed ? 'p-2' : 'p-3'}`;

/** Logo no topo do menu lateral; recolhido, só o ícone. */
export function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  return (
    <Link to="/" className={`flex h-16 shrink-0 items-center ${collapsed ? 'justify-center' : 'px-3'}`}>
      {collapsed ? (
        <img src={icon} alt="Projeto.io" className="h-8 w-auto" />
      ) : (
        <img src={logo} alt="Projeto.io" className="h-14 w-auto" />
      )}
    </Link>
  );
}

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
