import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Archive, ChevronDown, ChevronRight, FileText, FolderKanban, Home, ListTodo } from 'lucide-react';
import { listProjects } from '../../api/projects';
import { queryKeys } from '../../api/queryKeys';
import { APP_VERSION } from '../../lib/appInfo';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
    isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
  }`;

const subLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-md py-1.5 pl-9 pr-3 text-xs ${
    isActive ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-900 hover:text-slate-300'
  }`;

function SectionLabel({ children }: { children: string }) {
  return <p className="mb-1 mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-slate-600">{children}</p>;
}

export function Sidebar() {
  const location = useLocation();
  const { data: projects } = useQuery({ queryKey: queryKeys.projects(false), queryFn: () => listProjects(false) });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const match = location.pathname.match(/^\/projects\/([^/]+)/);
    if (match) {
      setExpanded((prev) => new Set(prev).add(match[1]));
    }
  }, [location.pathname]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <aside className="thin-scrollbar hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-slate-800 sm:flex">
      <nav className="flex flex-1 flex-col gap-1 p-3">
        <NavLink to="/" end className={navLinkClass}>
          <Home size={16} />
          Página inicial
        </NavLink>

        <SectionLabel>Espaço de trabalho</SectionLabel>
        <NavLink to="/projects" end className={navLinkClass}>
          <FolderKanban size={16} />
          Projetos
        </NavLink>
        <NavLink to="/projects/archived" className={navLinkClass}>
          <Archive size={16} />
          Arquivos
        </NavLink>

        <SectionLabel>Projetos</SectionLabel>
        {projects?.length === 0 && <p className="px-3 py-1 text-xs text-slate-600">Nenhum projeto ativo</p>}
        {projects?.map((project) => {
          const isExpanded = expanded.has(project.id);
          const isCurrentProject = location.pathname.startsWith(`/projects/${project.id}`);

          return (
            <div key={project.id}>
              <div className="flex items-center">
                <button
                  onClick={() => toggle(project.id)}
                  className="rounded p-1 text-slate-500 hover:text-slate-300"
                  aria-label={isExpanded ? 'Recolher projeto' : 'Expandir projeto'}
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <NavLink to={`/projects/${project.id}/board`} className={`${navLinkClass({ isActive: isCurrentProject })} flex-1`}>
                  <span className="truncate">{project.name}</span>
                </NavLink>
              </div>
              {isExpanded && (
                <div className="flex flex-col gap-0.5">
                  <NavLink to={`/projects/${project.id}/list`} className={subLinkClass}>
                    <ListTodo size={14} />
                    Itens
                  </NavLink>
                  <NavLink to={`/projects/${project.id}/documents`} className={subLinkClass}>
                    <FileText size={14} />
                    Páginas
                  </NavLink>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <footer className="px-3 py-3 text-center text-[11px] text-slate-600">
        Pulsar © 2026 Projeto.io • v{APP_VERSION}
        <br />
        <Link to="/privacidade" target="_blank" className="hover:text-slate-400">
          Política de Privacidade
        </Link>
      </footer>
    </aside>
  );
}
