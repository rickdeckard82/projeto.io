import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProject } from '../api/projects';
import { queryKeys } from '../api/queryKeys';
import { RoleGate } from '../auth/RoleGate';
import { Spinner } from '../components/common/Spinner';
import { Toast } from '../components/common/Toast';
import { socket } from '../lib/socket';

const tabs = [
  { to: 'board', label: 'Quadro' },
  { to: 'list', label: 'Lista' },
  { to: 'documents', label: 'Documentos' },
];

export function ProjectDetailLayout() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [justArchived, setJustArchived] = useState(false);
  const { data: project, isLoading } = useQuery({
    queryKey: queryKeys.project(projectId!),
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
  });

  // Tempo real: entra na sala do projeto para saber, na hora, se ALGUÉM MAIS arquivar este
  // projeto enquanto esta tela está aberta — sem isso, quem já estava com o board aberto
  // continuava vendo e mexendo nele normalmente até recarregar a página. Entrar/sair da sala
  // não conflita com o mesmo join feito por `useWorkItems` no board/lista: é a mesma sala,
  // socket.io simplesmente ignora um join duplicado.
  useEffect(() => {
    if (!projectId) return;

    socket.emit('join-project', projectId);
    const onProjectChanged = (payload: { projectId: string }) => {
      if (payload.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      }
    };
    socket.on('project:changed', onProjectChanged);

    return () => {
      socket.off('project:changed', onProjectChanged);
      socket.emit('leave-project', projectId);
    };
  }, [projectId, queryClient]);

  // Detecta a TRANSIÇÃO de ativo -> arquivado (não o caso de abrir direto um projeto que já
  // estava arquivado, ex.: vindo da página "Arquivos" — isso continua sendo uma visualização
  // legítima, só leitura).
  const previousArchivedAtRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!project) return;
    if (previousArchivedAtRef.current === null && project.archivedAt) {
      setJustArchived(true);
    }
    previousArchivedAtRef.current = project.archivedAt;
  }, [project]);

  useEffect(() => {
    if (!justArchived) return;
    const timer = setTimeout(() => navigate('/projects'), 2500);
    return () => clearTimeout(timer);
  }, [justArchived, navigate]);

  if (isLoading) return <Spinner />;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-1 flex items-center gap-2">
        {project?.icon && <span className="text-lg">{project.icon}</span>}
        <h1 className="text-lg font-semibold text-slate-100">{project?.name}</h1>
        {project?.key && (
          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs font-medium tracking-wide text-slate-400">
            {project.key}
          </span>
        )}
      </div>
      {project?.description && <p className="mb-4 text-sm text-slate-400">{project.description}</p>}

      <div className="mb-6 flex gap-1 border-b border-slate-800">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `px-3 py-2 text-sm ${
                isActive ? 'border-b-2 border-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
        <RoleGate allow={['ADMIN', 'SENIOR']}>
          <NavLink
            to="metrics"
            className={({ isActive }) =>
              `px-3 py-2 text-sm ${
                isActive ? 'border-b-2 border-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            Métricas
          </NavLink>
        </RoleGate>
        <RoleGate allow={['ADMIN', 'SENIOR']}>
          <NavLink
            to="settings"
            className={({ isActive }) =>
              `px-3 py-2 text-sm ${
                isActive ? 'border-b-2 border-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            Configurações
          </NavLink>
        </RoleGate>
      </div>

      <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </div>

      {justArchived && (
        <Toast
          message="Este projeto foi arquivado por outro usuário. Voltando para a lista de projetos..."
          onClose={() => setJustArchived(false)}
        />
      )}
    </div>
  );
}
