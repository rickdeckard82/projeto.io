import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getPrivacySettings } from '../api/privacySettings';
import { queryKeys } from '../api/queryKeys';
import { AuthWaves } from '../components/common/AuthWaves';
import { Spinner } from '../components/common/Spinner';
import logo from '../assets/projeto-io-logo.svg';
import { APP_VERSION } from '../lib/appInfo';

/**
 * Página pública de Política de Privacidade. O conteúdo é montado a partir de duas fontes:
 * fatos genéricos sobre o sistema (verdadeiros para qualquer organização que rode esta mesma
 * base de código) e a configuração de `/settings/privacy` (quem é o controlador/encarregado
 * desta instância específica) — deliberadamente não fixa nenhuma empresa no código, já que o
 * software é reutilizável por qualquer organização que suba os próprios containers.
 */
export function PrivacyPolicyPage() {
  const { data: settings, isLoading } = useQuery({
    queryKey: queryKeys.privacySettings,
    queryFn: getPrivacySettings,
  });

  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden px-4 pt-10">
      <AuthWaves />
      <img src={logo} alt="Projeto.io" className="relative z-10 mb-8 h-16 w-auto" />

      <div className="relative z-10 w-full max-w-2xl rounded-lg border border-slate-800 bg-slate-900 p-8 text-sm text-slate-300">
        <h1 className="mb-6 text-lg font-semibold text-slate-100">Política de Privacidade</h1>

        {isLoading ? (
          <Spinner />
        ) : (
          <div className="space-y-5">
            <Section title="Controlador dos dados">
              {settings?.controllerName ? (
                <p>
                  {settings.controllerName}
                  {settings.controllerDocument ? ` — ${settings.controllerDocument}` : ''}
                </p>
              ) : (
                <p className="text-slate-500">
                  A organização que administra esta instância ainda não informou seus dados de identificação.
                  Contate o administrador do sistema para mais informações.
                </p>
              )}
            </Section>

            <Section title="Encarregado pelo tratamento de dados (DPO)">
              {settings?.dpoName || settings?.dpoEmail ? (
                <p>
                  {settings.dpoName}
                  {settings.dpoName && settings.dpoEmail ? ' — ' : ''}
                  {settings.dpoEmail}
                </p>
              ) : (
                <p className="text-slate-500">Esta instância ainda não possui um encarregado (DPO) designado.</p>
              )}
            </Section>

            <Section title="Quais dados coletamos">
              <p>
                Nome completo, e-mail e senha (armazenada como hash, nunca em texto plano) no cadastro; foto de
                perfil, opcional, informada pelo próprio usuário; e o conteúdo que você cria no sistema — projetos,
                tarefas, comentários e documentos.
              </p>
            </Section>

            <Section title="Para que usamos">
              <p>
                Autenticação e controle de acesso, atribuição e acompanhamento de tarefas, e colaboração em
                projetos e documentos dentro da organização.
              </p>
            </Section>

            <Section title="Com quem compartilhamos">
              <p>
                Apenas com outras pessoas da mesma organização que tenham acesso ao projeto em questão. Não
                compartilhamos dados com serviços de terceiros fora da infraestrutura da própria organização.
              </p>
            </Section>

            <Section title="Cookies">
              <p>
                Usamos apenas cookies de sessão estritamente necessários (protegidos contra acesso via JavaScript),
                para manter você autenticado. Não usamos cookies de rastreamento ou publicidade.
              </p>
            </Section>

            <Section title="Por quanto tempo mantemos seus dados">
              <p>
                {settings?.retentionNotice ||
                  'Mantemos seus dados enquanto sua conta estiver ativa. Em caso de desativação, o histórico de atividade pode ser preservado para manter o contexto dos projetos, salvo pedido de eliminação.'}
              </p>
            </Section>

            <Section title="Seus direitos">
              <p>
                Acesso e portabilidade: baixe uma cópia de todos os seus dados em Configurações → Perfil → "Baixar
                meus dados". Eliminação: solicite a um administrador a anonimização da sua conta.
              </p>
            </Section>

            {settings?.additionalNotes && (
              <Section title="Observações adicionais">
                <p className="whitespace-pre-wrap">{settings.additionalNotes}</p>
              </Section>
            )}

            {settings?.updatedAt && (
              <p className="pt-2 text-xs text-slate-600">
                Última atualização: {new Date(settings.updatedAt).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-500">
          {/* "/" leva à página inicial se houver sessão; sem sessão, o ProtectedRoute redireciona ao login. */}
          <Link to="/" className="text-indigo-400">
            Voltar para a página inicial
          </Link>
        </p>
      </div>

      <footer className="relative z-10 mt-auto pb-6 pt-10 text-center text-xs text-slate-600">
        Pulsar © 2026 Projeto.io • v{APP_VERSION}
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      {children}
    </section>
  );
}
