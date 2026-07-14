import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDocuments } from '../hooks/useDocuments';
import { useAuth } from '../auth/AuthContext';
import { canEditDocument } from '../lib/permissions';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { EmptyState } from '../components/common/EmptyState';
import { DocumentListItem } from '../components/documents/DocumentListItem';

export function ProjectDocumentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { documents, isLoading, createDocument } = useDocuments(projectId!);
  const [creating, setCreating] = useState(false);

  const canEdit = user ? canEditDocument(user.globalRole) : false;

  const handleCreate = async () => {
    setCreating(true);
    try {
      const doc = await createDocument({ title: 'Novo documento', content: '' });
      navigate(`/projects/${projectId}/documents/${doc.id}`);
    } finally {
      setCreating(false);
    }
  };

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">Documentos</h2>
        {canEdit && (
          <Button onClick={handleCreate} disabled={creating}>
            Novo documento
          </Button>
        )}
      </div>

      {documents.length === 0 && <EmptyState title="Nenhum documento neste projeto" />}

      <div className="flex flex-col gap-2">
        {documents.map((doc) => (
          <DocumentListItem key={doc.id} projectId={projectId!} document={doc} />
        ))}
      </div>
    </div>
  );
}
