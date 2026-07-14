import { useParams } from 'react-router-dom';
import { ItemListTable } from '../components/items/ItemListTable';

export function ProjectListViewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  if (!projectId) return null;
  return <ItemListTable projectId={projectId} />;
}
