import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { NotesPage } from './pages/NotesPage';
import { ProjectsListPage } from './pages/ProjectsListPage';
import { ArchivedProjectsPage } from './pages/ArchivedProjectsPage';
import { ProjectDetailLayout } from './pages/ProjectDetailLayout';
import { ProjectBoardPage } from './pages/ProjectBoardPage';
import { ProjectListViewPage } from './pages/ProjectListViewPage';
import { ProjectDocumentsPage } from './pages/ProjectDocumentsPage';
import { DocumentEditorPage } from './pages/DocumentEditorPage';
import { ProjectSettingsPage } from './pages/ProjectSettingsPage';
import { AccountSettingsLayout } from './pages/AccountSettingsLayout';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';
import { SecuritySettingsPage } from './pages/SecuritySettingsPage';
import { UsersAdminPage } from './pages/UsersAdminPage';
import { AllowedDomainsSettingsPage } from './pages/AllowedDomainsSettingsPage';
import { SmtpSettingsPage } from './pages/SmtpSettingsPage';
import { PrivacySettingsPage } from './pages/PrivacySettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/privacidade" element={<PrivacyPolicyPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/settings" element={<AccountSettingsLayout />}>
            <Route index element={<Navigate to="profile" replace />} />
            <Route path="profile" element={<ProfileSettingsPage />} />
            <Route path="security" element={<SecuritySettingsPage />} />
            <Route path="users" element={<UsersAdminPage />} />
            <Route path="allowed-domains" element={<AllowedDomainsSettingsPage />} />
            <Route path="smtp" element={<SmtpSettingsPage />} />
            <Route path="privacy" element={<PrivacySettingsPage />} />
          </Route>
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/projects" element={<ProjectsListPage />} />
          <Route path="/projects/archived" element={<ArchivedProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectDetailLayout />}>
            <Route index element={<Navigate to="board" replace />} />
            <Route path="board" element={<ProjectBoardPage />} />
            <Route path="list" element={<ProjectListViewPage />} />
            <Route path="documents" element={<ProjectDocumentsPage />} />
            <Route path="documents/:documentId" element={<DocumentEditorPage />} />
            <Route path="settings" element={<ProjectSettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
