import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDocument } from '../api/documents';
import { queryKeys } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { canEditDocument } from '../lib/permissions';
import { useDocuments } from '../hooks/useDocuments';
import { Spinner } from '../components/common/Spinner';
import { Toast } from '../components/common/Toast';
import { DocumentEditor } from '../components/documents/DocumentEditor';

function extractErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return message || fallback;
}

export function DocumentEditorPage() {
  const { projectId, documentId } = useParams<{ projectId: string; documentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { updateDocument, deleteDocument } = useDocuments(projectId!);
  const [error, setError] = useState<string | null>(null);

  const { data: document, isLoading } = useQuery({
    queryKey: queryKeys.document(documentId!),
    queryFn: () => getDocument(documentId!),
    enabled: !!documentId,
  });

  if (isLoading || !document) return <Spinner />;

  const canEdit = user ? canEditDocument(user.globalRole) : false;

  return (
    <>
      <DocumentEditor
        document={document}
        editable={canEdit}
        onSave={(data) =>
          updateDocument({ id: documentId!, data })
            .then(() => {})
            .catch((err) => {
              setError(extractErrorMessage(err, 'Não foi possível salvar o documento.'));
            })
        }
        onDelete={() =>
          deleteDocument(documentId!)
            .then(() => navigate(`/projects/${projectId}/documents`))
            .catch((err) => {
              setError(extractErrorMessage(err, 'Não foi possível excluir o documento.'));
            })
        }
      />
      {error && <Toast message={error} onClose={() => setError(null)} />}
    </>
  );
}
