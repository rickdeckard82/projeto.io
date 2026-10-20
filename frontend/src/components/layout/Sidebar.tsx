import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Archive, Boxes, ChevronDown, ChevronRight, FileText, FolderKanban, Home, ListTodo, StickyNote, Tag } from 'lucide-react';
import { listProjects } from '../../api/projects';
import { listModules } from '../../api/modules';
import { queryKeys } from '../../api/queryKeys';
import { useAuth } from '../../auth/AuthContext';
import { filterProjectsByOwnership, ProjectFilter, ProjectFilterMenu } from '../projects/ProjectFilterMenu';
import {
  SectionLabel,
  SidebarBrand,
  SidebarCollapseButton,
  sidebarAsideClass,
  sidebarLinkClass,
  sidebarNavClass,
} from './sidebarShared';

const subLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-md py-1.5 pl-9 pr-3 text-xs ${
    isActive ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-900 hover:text-slate-300'
  }`;

/** Até duas iniciais do nome ("Pulse Backup" → "PB", "Projeto.io" → "PI", "UNIVESP" → "UN"). */
function projectInitials(name: string): string {
  const words = name.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (words.length === 0) return '?';
  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
  return letters.toUpperCase();
}

/** Sub-links dos módulos de um projeto expandido — só busca quando o projeto está expandido, para não disparar uma query por projeto na lista inteira. */
function ProjectModuleLinks({ projectId, isExpanded }: { projectId: string; isExpanded: boolean }) {
  const { data: modules } = useQuery({
    queryKey: queryKeys.projectModules(projectId),
    queryFn: () => listModules(projectId),
    enabled: isExpanded,
  });

  return (
    <>
      {modules?.map((moduleItem) => (
        <NavLink key={moduleItem.id} to={`/projects/${projectId}/modules/${moduleItem.id}`} className={subLinkClass}>
          <Boxes size={14} />
          <span className="truncate">{moduleItem.name}</span>
        </NavLink>
      ))}
    </>
  );
}

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Gaveta aberta no mobile (no desktop é ignorado). */
  mobileOpen: boolean;
}

export function Sidebar({ collapsed, onToggleCollapsed, mobileOpen }: SidebarProps) {
  const navLinkClass = sidebarLinkClass(collapsed);
  const location = useLocation();
  const { user } = useAuth();
  const { data: projects } = useQuery({ queryKey: queryKeys.projects(false), queryFn: () => listProjects(false) });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>('all');
  const filteredProjects = filterProjectsByOwnership(projects, projectFilter, user?.id);

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
    <aside className={sidebarAsideClass(collapsed, mobileOpen)}>
      <SidebarBrand collapsed={collapsed} />
      <nav className={sidebarNavClass(collapsed)}>
        <SidebarCollapseButton collapsed={collapsed} onToggle={onToggleCollapsed} />
        <NavLink to="/" end className={navLinkClass} title={collapsed ? 'Página inicial' : undefined}>
          <Home size={16} className="shrink-0" />
          {!collapsed && 'Página inicial'}
        </NavLink>

        <SectionLabel collapsed={collapsed}>Espaço de trabalho</SectionLabel>
        <NavLink to="/projects" end className={navLinkClass} title={collapsed ? 'Projetos' : undefined}>
          <FolderKanban size={16} className="shrink-0" />
          {!collapsed && 'Projetos'}
        </NavLink>
        <NavLink to="/projects/archived" className={navLinkClass} title={collapsed ? 'Arquivos' : undefined}>
          <Archive size={16} className="shrink-0" />
          {!collapsed && 'Arquivos'}
        </NavLink>
        <NavLink to="/notes" className={navLinkClass} title={collapsed ? 'Notas' : undefined}>
          <StickyNote size={16} className="shrink-0" />
          {!collapsed && 'Notas'}
        </NavLink>
        <NavLink to="/labels" className={navLinkClass} title={collapsed ? 'Etiquetas' : undefined}>
          <Tag size={16} className="shrink-0" />
          {!collapsed && 'Etiquetas'}
        </NavLink>

        {collapsed ? (
          <>
            {/* Recolhido: cada projeto vira as iniciais num quadradinho monocromático (mesma cor e
                tamanho dos ícones do menu), com o nome no tooltip. */}
            <SectionLabel collapsed>Projetos</SectionLabel>
            {filteredProjects?.map((project) => (
              <NavLink
                key={project.id}
                to={`/projects/${project.id}/board`}
                title={project.name}
                className={navLinkClass({ isActive: location.pathname.startsWith(`/projects/${project.id}`) })}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border border-current text-[8px] font-semibold leading-none">
                  {projectInitials(project.name)}
                </span>
              </NavLink>
            ))}
          </>
        ) : (
          <>
            <div className="mb-1 mt-4 flex items-center justify-between px-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Projetos</p>
              <ProjectFilterMenu value={projectFilter} onChange={setProjectFilter} align="right" />
            </div>
            {filteredProjects?.length === 0 && (
              <p className="px-3 py-1 text-xs text-slate-600">
                {projectFilter === 'all' ? 'Nenhum projeto ativo' : 'Nenhum projeto encontrado para este filtro'}
              </p>
            )}
            {filteredProjects?.map((project) => {
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
                      <ProjectModuleLinks projectId={project.id} isExpanded={isExpanded} />
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </nav>
    </aside>
  );
}
