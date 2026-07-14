import { useParams } from 'react-router-dom';
import { KanbanBoard } from '../components/kanban/KanbanBoard';

export function ProjectBoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  if (!projectId) return null;
  return <KanbanBoard projectId={projectId} />;
}
