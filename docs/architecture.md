# Arquitetura — Projeto.io

Detalhe completo de módulos, modelo de dados, autenticação, tempo real, LGPD, recorrência e fuso horário. Ver `CLAUDE.md` para convenções, comandos e regras críticas do dia a dia.

## Backend (`backend/src`) — NestJS

Módulos por recurso, cada um com `*.controller.ts` + `*.service.ts` + `dto/`: `auth`, `users`, `projects`, `labels`, `modules` (agrupamento opcional de itens dentro de um projeto, ver seção própria abaixo), `work-items`, `documents`, `settings` (domínios permitidos, SMTP e privacidade/LGPD), `notes` (bloco de notas pessoal e privado, ver seção própria abaixo), `metrics` (métricas agregadas por projeto, restrito a Admin/Senior — ver seção própria abaixo), mais `mail/` (envio de e-mail transacional), `realtime/` (WebSocket, ver seção de tempo real abaixo), `prisma/` (client singleton) e `common/` (guards, decorators, filters, `utils/` compartilhados — `token-hash.util.ts` para hash SHA-256 de tokens, `crypto.util.ts` para criptografia reversível AES-256-GCM).

### Cadeia de autorização

Aplicada globalmente via `APP_GUARD` em `app.module.ts`:

1. `JwtAuthGuard` — valida o JWT (cookie `access_token` ou header `Bearer`); rotas marcadas com `@Public()` pulam essa checagem.
2. `RolesGuard` — compara `@Roles(...)` do handler com o `globalRole` do usuário (`ADMIN` / `SENIOR` / `MEMBER` / `VIEWER`). Sem `@Roles()`, qualquer usuário autenticado passa. `SENIOR` tem tudo que `MEMBER` tem (criar/editar itens, documentos, etiquetas — todo endpoint com `@Roles(ADMIN, SENIOR, MEMBER)`) mais criar projeto, arquivar/desarquivar projeto e adicionar membro (`@Roles(ADMIN, SENIOR)` nesses quatro endpoints específicos em `projects.controller.ts`/`members.controller.ts`); atualizar/remover projeto e remover membro continuam só `ADMIN`.
3. `ProjectMemberGuard` — aplicado manualmente com `@UseGuards(ProjectMemberGuard)` + `@ProjectResource(kind, param)` nos controllers de recursos de projeto. Resolve o `projectId` a partir do parâmetro de rota (direto se `kind: 'project'`, ou via lookup se `'workItem' | 'document' | 'label'`), depois:
   - Admin sempre passa.
   - Caso contrário, precisa de uma linha em `project_members`.
   - Sem membership, **GET** ainda passa se `project.isPublic === true` (leitura pública); qualquer outro método é bloqueado.

Esse desenho faz o `ProjectMemberGuard` cuidar só de "faz parte do projeto (ou o projeto é público)?" — a distinção de permissão de escrita por papel (Admin/Membro podem escrever, Visualizador não) fica inteiramente a cargo do `@Roles()` em cada endpoint de mutação.

### Modelo de dados (`prisma/schema.prisma`)

`User` (papel global; `timezone` — fuso IANA, ex.: "America/Sao_Paulo", `@default("America/Sao_Paulo")` — editável só em `/settings/profile`, ver seção de fuso horário abaixo; `emailVerifiedAt`/`verificationTokenHash`/`verificationTokenExpiresAt`/`verificationEmailSentAt` controlam a confirmação de e-mail do autocadastro) → `Project` (dono, `key` único opcional tipo "ZABBIXIA", `icon`, `coverColor`, `isPublic`, `archivedAt`) → `ProjectMember` (join table, é a fonte da verdade de acesso) → `Status` (colunas do kanban, categorizadas em `BACKLOG/UNSTARTED/STARTED/COMPLETED/CANCELLED`, 5 seedadas por projeto em `default-statuses.ts`) → `WorkItem` (auto-referencia `parentId` para sub-itens — que aparecem como cards próprios no board, com indicador "↳ parent title"; um item só pode ir para `COMPLETED`/`CANCELLED` se todos os seus sub-itens já estiverem `COMPLETED`/`CANCELLED`; `statusLockedById` trava o item enquanto seu status for de categoria `STARTED` — só quem o moveu pra lá (ou um Admin) pode mudar o status de novo; sai da categoria `STARTED` e a trava limpa sozinha, ver `WorkItemsService.updateStatus`; sair da categoria `BACKLOG` exige ao menos um responsável já atribuído (mesmo método); um item que já chegou em `COMPLETED`/`CANCELLED` fica travado — só um Admin consegue movê-lo de novo (voltar ao fluxo ativo ou trocar entre status de conclusão/cancelamento), qualquer outro papel esbarra num `ForbiddenException`, e o frontend já desabilita o seletor de status antes disso (`ItemDetailModal`, indicador "🔒 Encerrado", mesmo padrão visual da trava de "Em andamento"); `recurrenceUnit`/`recurrenceInterval` opcionais marcam o item como recorrente — ver seção de Recorrência abaixo; `ItemAssignee`/`ItemLabel` são join tables N:N; `moduleId` opcional referencia `Module`) → `ItemActivity` (feed de eventos do item — criação, mudança de título/descrição/prioridade/status, label/assignee adicionado-removido, comentário — logado automaticamente por `WorkItemsService.logActivity`, exposto em `GET /items/:id/activities`) → `Document` (conteúdo markdown puro).

`AllowedDomain` (domínios de e-mail liberados para autocadastro), `SmtpSettings` (linha singleton `id: 'singleton'`, senha sempre em `authPassEncrypted`) e `PrivacySettings` (linha singleton, dados do controlador/encarregado para a página pública `/privacidade` — ver seção de LGPD abaixo) não pertencem a essa cadeia — são configuração global, geridas pelo `SettingsModule`.

`Project.key`: se o usuário não informar, é sugerido a partir do nome (`project-key.util.ts`) e desambiguado com sufixo numérico em caso de colisão; é imutável após a criação (não existe no `UpdateProjectDto`).

Auth usa JWT de acesso (curto) + refresh token persistido (hash SHA-256, via `common/utils/token-hash.util.ts`) em `refresh_tokens`, permitindo revogação/logout. Tokens vão em cookies httpOnly (`access_token`/`refresh_token`), setados em `auth.controller.ts`. `RefreshTokenCleanupService` (`auth/refresh-token-cleanup.service.ts`, `@Cron` via `@nestjs/schedule`, registrado em `ScheduleModule.forRoot()` no `AppModule`) roda diariamente às 3h e apaga tokens revogados/expirados há mais de 90 dias — política de retenção (LGPD); um token inválido não tem mais uso, então não há razão para retê-lo indefinidamente.

### Autenticação de dois fatores (`auth/two-factor.service.ts`)

Opcional por usuário. TOTP compatível com Google Authenticator/Authy, via `otplib`. `User.twoFactorSecret` fica criptografado em repouso (mesmo esquema AES-256-GCM de `crypto.util.ts` usado na senha do SMTP) e só é gravado (em `POST /auth/2fa/setup`) antes mesmo de `twoFactorEnabled` virar `true` — a ativação de fato só acontece em `POST /auth/2fa/enable` depois de validar um código, momento em que também são gerados 8 códigos de recuperação (uso único, guardados como hash SHA-256 em `twoFactorRecoveryCodes`, nunca em texto puro).

Com 2FA ativo, `AuthService.login()` não emite os cookies de sessão direto: devolve `{ requiresTwoFactor: true, challengeToken }` — um JWT de curtíssima duração (5 min, claim `purpose: '2fa-challenge'`) que nunca é gravado como cookie, então não corre o risco de ser aceito por engano como token de sessão pelo `JwtAuthGuard`. O frontend troca esse `challengeToken` + o código (TOTP ou um código de recuperação) em `POST /auth/2fa/verify`, que aí sim chama `AuthService.issueTokens()`. Desativar (`POST /auth/2fa/disable`) exige a senha atual.

`AuthService` e `TwoFactorService` estão em arquivos separados de propósito — `TwoFactorService` depende de `AuthService.issueTokens()`, então a constante `TWO_FACTOR_CHALLENGE_PURPOSE` mora num terceiro arquivo (`two-factor-challenge.constants.ts`) só para as duas não precisarem se importar uma à outra.

### Autocadastro restrito por domínio + confirmação por e-mail

`POST /auth/register` só cria a conta se o domínio do e-mail estiver em `AllowedDomain` (tabela vazia = autocadastro bloqueado para todos) e o `SmtpSettings` singleton existir; a conta nasce com `emailVerifiedAt = null` e **não** inicia sessão. Um token de confirmação (bruto, hash SHA-256 salvo, validade 48h) é gerado e enviado por `MailModule` → `MailerService` (monta um `nodemailer` transport novo a cada envio, a partir do `SmtpSettings` do banco — nunca de env vars — decriptando a senha com `crypto.util.ts`). Se o envio falhar, a conta recém-criada é apagada (rollback) para não deixar um usuário eternamente não-confirmável; o erro real vai para o log do backend via `Logger`, nunca é exposto na resposta.

`GET /auth/verify-email?token=` confirma (`@Public()`); `POST /auth/resend-verification` reenvia com cooldown de 60s e resposta genérica (mesma mensagem exista ou não a conta, esteja ou não confirmada — evita enumeração). `JwtStrategy.validate()` e `AuthService.login()` bloqueiam usuários com `emailVerifiedAt` nulo. Usuários criados por um Admin via `POST /users` pulam esse fluxo inteiro (`emailVerifiedAt` já vem preenchido em `UsersService.create`) — a restrição vale só para o autocadastro público. Variáveis novas: `ENCRYPTION_KEY` (base64, 32 bytes — chave AES-256-GCM da senha do SMTP) e `FRONTEND_URL` (usada para montar o link do e-mail de confirmação).

### Direitos do titular / LGPD (`UsersService`, `SettingsModule`)

`GET /users/me/export` (`UsersService.exportOwnData`) reúne todos os dados pessoais do próprio usuário autenticado (perfil, itens criados/atribuídos, documentos, atividade, participação em projetos) para atender ao direito de acesso/portabilidade — nunca de outro usuário, sempre pelo id de quem chama.

`PATCH /users/:id/anonymize` (`UsersService.anonymize`, restrito a Admin) atende ao direito de eliminação: sobrescreve e-mail/nome/avatar/senha com valores não pessoais e revoga sessões, mas **não apaga a linha** — `WorkItem.createdBy`/`Document.createdBy` não têm `onDelete: Cascade`, então excluir de verdade quebraria o histórico de projetos; um Admin não pode anonimizar a própria conta.

`PrivacySettingsController` (`GET`/`PATCH /settings/privacy`, GET público) alimenta a página `/privacidade` com quem é o controlador/encarregado desta instância — deliberadamente configurável em vez de fixo no código, já que este software pode ser hospedado por qualquer organização.

### Tempo real (`backend/src/realtime/`)

`RealtimeGateway` (Socket.IO, via `@nestjs/websockets`) notifica navegadores conectados quando itens de trabalho (ou o próprio projeto) mudam, para não depender de recarregar a página para ver a mudança de outro usuário.

Autenticação do handshake: lê o cookie `access_token` diretamente do header do socket (não passa pelo pipeline de guards HTTP) e valida com o mesmo segredo do `JwtStrategy`; sem token válido, desconecta.

Autorização por sala: cada projeto é uma sala `project:<id>`, entrada liberada por `join-project` se o usuário for Admin, membro do projeto, ou o projeto for público (mesma regra de leitura do `ProjectMemberGuard`, reimplementada aqui porque o gateway não tem acesso a esse guard).

`WorkItemsService` injeta o gateway e emite `items:changed` (após criar/editar/mover/excluir item ou mudar responsáveis/etiquetas) e `activity:changed` (após comentário ou qualquer mudança que gere entrada de atividade) para a sala do projeto — payload mínimo (só o id), o cliente reage invalidando a query correspondente (TanStack Query) em vez de tentar reconciliar estado parcial. `ProjectsService` também injeta o gateway e emite `project:changed` ao arquivar/desarquivar (`emitProjectChanged`) — sem isso, quem já estivesse com o board aberto continuava vendo e mexendo no projeto normalmente depois de outro usuário arquivá-lo, até recarregar a página.

No frontend, `lib/socket.ts` mantém uma única conexão Socket.IO por sessão (`AuthContext` conecta/desconecta conforme login/logout); `useWorkItems` entra na sala do projeto e ouve `items:changed`, `ActivityFeed` ouve `activity:changed`, e `ProjectDetailLayout` também entra na mesma sala (join é idempotente) e ouve `project:changed` — só redireciona para `/projects` (com aviso) se detectar a **transição** de ativo para arquivado enquanto a tela já está aberta; abrir direto um projeto que já estava arquivado (ex.: vindo de "Arquivos") continua sendo uma visualização legítima, só leitura.

A notificação em tempo real é só UX — a garantia de verdade é do servidor: `WorkItemsService.assertProjectNotArchived()` rejeita com 403 qualquer escrita em item (criar/editar/mover/atribuir/etiquetar/excluir/comentar) se o projeto estiver arquivado, não importa se o cliente recebeu ou não o aviso via socket. Cobre itens de trabalho e o estado do projeto — documentos e outras telas ainda não têm sincronização ao vivo.

### Módulos de projeto (agrupamento de itens) (`backend/src/modules/`)

Agrupamento opcional de itens dentro de um projeto (ex.: "Sprint 1", "Backend") — `Module` é `projectId`-scoped (`@@unique([projectId, name])`), sem kanban próprio: reaproveita as mesmas colunas de `Status` do projeto, servindo só como um recorte (`WorkItem.moduleId`, opcional — um item pode não pertencer a nenhum módulo) sobre os itens já existentes.

Dois controllers, no mesmo padrão de `labels`: `ProjectModulesController` em `/projects/:projectId/modules` (listar/criar, `@Roles(ADMIN, SENIOR, MEMBER)` na criação) e `ModuleDetailController` em `/modules/:moduleId` (buscar/atualizar/remover, `ProjectResource('module', 'moduleId')` resolve o projeto via lookup no `ProjectMemberGuard`). Remover um módulo não apaga os itens dele — só limpa `moduleId` (`onDelete: SetNull`), que voltam a aparecer somente na visão geral do projeto.

No frontend, módulos são criados/editados/removidos em "Configurações" do projeto (`ProjectSettingsPage.tsx`) e aparecem dinamicamente no Sidebar, como sub-links dentro do projeto expandido (busca via `GET /projects/:id/modules`, só quando o projeto está expandido); cada módulo abre `ModuleDetailPage.tsx` (`/projects/:projectId/modules/:moduleId`), que reaproveita `KanbanBoard`/`ItemListTable` passando `moduleId` como filtro — itens criados a partir dessa tela já nascem vinculados ao módulo.

### Notas (`backend/src/notes/`)

Bloco de notas pessoal, não vinculado a projeto — `Note` (model livre de FK opcional além do autor) é **privada**: `GET /notes` (sem `@Roles()`/`ProjectMemberGuard`, qualquer usuário autenticado passa) já vem filtrado dentro do `NotesService.list()` por `createdById`, então cada usuário só vê as próprias notas, sem exceção nem para Admin. Qualquer usuário autenticado pode criar (`POST /notes`); editar/remover (`PATCH`/`DELETE /notes/:id`) é restrito a quem criou a nota, checado dentro do próprio `NotesService` (não via decorator, já que é autorização por dono, não por papel — e aqui nem o Admin tem bypass, ao contrário do resto do app). Exibido em duas telas: resumo na home (`components/home/NotesSection.tsx`, só cria) e página completa `/notes` (`NotesPage.tsx`, com editar/apagar).

### Métricas (`backend/src/metrics/`)

`GET /projects/:id/metrics` (restrito a `@Roles(ADMIN, SENIOR)`, além da membership do `ProjectMemberGuard`) devolve métricas agregadas de um projeto: contagem de itens por categoria de status, tempo médio "em andamento" até concluir, tempo de execução do projeto, duração de calendário do projeto (`createdAt` até `archivedAt`, ou até agora se ainda ativo), um resumo por responsável (itens atribuídos/concluídos/cancelados de cada um, mais `totalHours` — soma do tempo "em andamento" de todo item em que a pessoa é responsável; o item inteiro conta pra cada responsável, sem dividir entre eles quando há mais de um) e as tarefas recorrentes ativas do projeto (`recurringTasks`: quantas séries recorrentes ainda não terminaram e quantas vezes cada uma já se repetiu — ver `WorkItem.recurrenceCount` na seção de Recorrência abaixo; a query filtra `recurrenceUnit != null AND status.category NOT IN (COMPLETED, CANCELLED)`, o que basta pra achar exatamente um item por série sem precisar de uma FK ligando a cadeia inteira, já que o item anterior de toda série fica travado em `COMPLETED` assim que gera a próxima ocorrência).

Tempo real "em andamento" por item: `WorkItem.inProgressSince`/`inProgressSeconds` (sem tabela nova, só duas colunas) — mantidos por `WorkItemsService.updateStatus` no mesmo espírito da trava de `statusLockedById`: ao entrar em categoria `STARTED`, grava `inProgressSince`; ao sair (concluir, cancelar ou voltar), soma o intervalo decorrido em `inProgressSeconds` e limpa `inProgressSince` — cobre o item saindo e voltando pra `STARTED` mais de uma vez, sem depender de reconstruir o histórico de `ItemActivity`.

`MetricsService` usa isso para `avgInProgressHours` (média de `inProgressSeconds` dos itens hoje em `COMPLETED` — valor final, já consolidado) e `totalExecutionHours` (soma do tempo "em andamento" de todos os itens do projeto, incluindo o intervalo ainda em curso dos itens que estão em `STARTED` agora — para não subestimar trabalho em progresso no momento do cálculo).

No frontend, `ItemDetailModal` mostra o tempo "em andamento" do item individual; aba "Métricas" em `ProjectDetailLayout` mostra os agregados — visível só a Admin/Senior via `RoleGate` na aba e redirect client-side em `ProjectMetricsPage.tsx` (mesmo padrão de `/settings/allowed-domains` etc.), com o `@Roles()` do backend como garantia real.

### Recorrência de itens

`WorkItem.recurrenceUnit` (`DAY`/`WEEK`/`MONTH`) + `recurrenceInterval` marcam um item como recorrente — "a cada N dias" (recorrência personalizada) é só `DAY` com `interval` > 1, não existe uma unidade "custom" separada no schema, a UI (`RecurrenceSelect.tsx`) que decide como apresentar cada combinação.

Quando o item é movido para um status de categoria `COMPLETED`, `WorkItemsService.updateStatus` chama `generateNextOccurrence`, que cria a próxima ocorrência: mesmo título/descrição/prioridade/módulo/etiquetas e a própria recorrência (para a série continuar indefinidamente) — responsáveis não são copiados de propósito, a nova ocorrência começa sem dono definido, forçando alguém a assumi-la. Entra sempre no primeiro status do projeto (menor `position`, mesmo padrão do `create` sem `statusId`). Datas avançam `interval` unidades de `unit` a partir das datas do item concluído (mês trata corretamente fim de mês, ex.: 31/jan + 1 mês = 28/fev); sem nenhuma data original, a nova ocorrência ganha um `dueDate` calculado a partir do momento da conclusão, só para dar um alvo.

Fica registrado no histórico de atividade dos dois lados: `RECURRENCE_GENERATED` no item concluído (com o id/título da nova ocorrência) e `CREATED` na nova ocorrência. Editável via o mesmo `PATCH /items/:itemId` (`UpdateItemDto`) — `recurrenceUnit: null` desliga a recorrência. No frontend, `RecurrenceSelect` (usado em `ItemDetailModal`) e um ícone de repetição no card do Kanban/lista (`item.recurrenceUnit` truthy) são a única UI; não há tela separada para gerenciar a série.

`WorkItem.recurrenceCount` conta quantas vezes a série já se repetiu até chegar neste item: `0` no item original (nunca repetiu), `N` na N-ésima ocorrência gerada — `generateNextOccurrence` propaga `completedItem.recurrenceCount + 1` para a próxima. Como cada ocorrência nasce fora de `COMPLETED`/`CANCELLED` e a anterior fica travada nessa categoria, nunca há mais de um item "ativo" por série ao mesmo tempo — não precisa de uma FK própria ligando toda a cadeia para saber quantas vezes ela já repetiu (usado por `MetricsService` em `recurringTasks`, ver seção de Métricas acima).

### Fuso horário por usuário

O banco grava tudo em UTC (comportamento padrão do Prisma `DateTime`); a exibição é onde o fuso de cada usuário (`User.timezone`, editável em `/settings/profile` via `PATCH /users/:id`, validado contra fusos IANA reais com `Intl.DateTimeFormat` — ver `IsIanaTimezone` em `update-user.dto.ts`) entra em jogo, e só para **timestamps de verdade** (`createdAt`/`updatedAt`, atividade, "atualizado em" de documento) — `frontend/src/lib/dateFormat.ts` tem `formatDateTime(iso, timezone)` pra isso, usado por exemplo em `DocumentListItem` e (via `getGreeting`/`formatLongDate` em `lib/greeting.ts`) no cabeçalho da home.

**Datas "puras"** como `WorkItem.dueDate`/`startDate` (só o dia escolhido num `<input type="date">`, sem hora real) são o oposto: `formatDate(iso)` no mesmo arquivo rearranja os dígitos da string ISO em vez de converter fuso — um `dueDate` gravado como meia-noite UTC do dia escolhido, se passasse pelo fuso do usuário, podia voltar um dia (ex.: 26/07 vira 25/07 às 21h em UTC-3); não existe "hora" nesses campos pra justificar a conversão.

`/auth/me` inclui `timezone` no payload do usuário logado (`AuthContext`); usuários criados por Admin (`POST /users`) não escolhem fuso na criação, só depois no próprio perfil — nasce com o default `America/Sao_Paulo`.

## Frontend (`frontend/src`) — React + Vite

- **Roteamento**: `App.tsx` define as rotas; tudo autenticado fica sob `<ProtectedRoute>` → `<AppShell>` (Topbar + Sidebar fixos, `<Outlet/>` para o conteúdo). Login (com ou sem 2FA) leva para `/` (página inicial), não para a lista de projetos. Rotas de projeto são aninhadas sob `ProjectDetailLayout` (`/projects/:projectId/{board,list,documents,metrics,settings,modules/:moduleId}`) — a aba/rota `metrics` é visível só a Admin/Senior (ver seção de Métricas acima); `modules/:moduleId` (`ModuleDetailPage`) não é uma aba do `ProjectDetailLayout`, é acessada pelos sub-links dinâmicos de módulo no Sidebar (ver seção de Módulos acima). Rotas públicas (fora do `<ProtectedRoute>`): `/login`, `/register`, `/verify-email` (`VerifyEmailPage`, lê `?token=` e chama `GET /auth/verify-email`), `/privacidade` (`PrivacyPolicyPage`, lê `GET /settings/privacy`, público). `/settings/allowed-domains` (`AllowedDomainsSettingsPage`), `/settings/smtp` (`SmtpSettingsPage`) e `/settings/privacy` (`PrivacySettingsPage`) ficam dentro de `/settings`, visíveis só a Admin (`RoleGate` no `SettingsSidebar` + redirect client-side; a garantia real é o `@Roles(ADMIN)` do backend). `/changelog` (`ChangelogPage`) fica dentro do `AppShell` (autenticado, não é público como `/privacidade`) e lê a lista estática de `lib/changelog.ts` — ver seção de Versionamento no `CLAUDE.md`; o "v{APP_VERSION}" no rodapé do Sidebar/SettingsSidebar é um link pra lá.
- **Dados/estado servidor**: TanStack Query em todo lugar; `api/queryKeys.ts` centraliza as chaves. Módulos em `api/*.ts` são funções `axios` puras por recurso; `api/client.ts` tem o interceptor que renova o access token via `/auth/refresh` em qualquer `401` (exceto chamadas para `/auth/*`) e replay da requisição original. `lib/socket.ts` mantém a conexão Socket.IO única da sessão (ver seção de tempo real acima), conectada/desconectada pelo `AuthContext` conforme login/logout.
- **Sessão**: `auth/AuthContext.tsx` guarda o usuário atual (busca `/auth/me` no mount); `auth/RoleGate.tsx` (`<RoleGate allow={['ADMIN']}>`) e `lib/permissions.ts` (funções puras `canEditItem`, `canEditDocument`) fazem a checagem de UI — **é só conveniência visual**, a garantia real de acesso é sempre o backend. `GET /users` (dados completos, com e-mail) é restrito a Admin (`@Roles(ADMIN)`), usado só por `UsersAdminPage`; os seletores de pessoa usados por qualquer usuário (`AssigneePicker`, `LeadPicker`, `AddMemberDialog`, board/lista) usam `GET /users/directory` (id/nome/avatar, sem e-mail) — separação feita por minimização de dados (LGPD art. 6º, III), já que esses seletores não precisam do e-mail para funcionar.
- **Kanban**: `components/kanban/KanbanBoard.tsx` usa `@dnd-kit/core`; `onDragEnd` chama `PATCH /items/:id/status`. Colunas vêm de `GET /projects/:id/statuses`.
- **Sidebar** (`components/layout/Sidebar.tsx`): busca a lista de projetos ativos do usuário e monta navegação expansível por projeto (Itens → view de lista, Páginas → documentos), com auto-expansão do projeto da rota atual.
- Sem upload de arquivo real: capa de projeto (`coverColor`) e "links rápidos" da home (`components/home/QuickLinks.tsx`) usam paletas fixas / `localStorage` por usuário, não backend.

## Fora do escopo (decisão deliberada do v1)

Sem IA/automação, sem notificações, sem anexos de arquivo, sem papéis por projeto (só papel global), sem workspaces multi-nível. Ver `README.md` para o fluxo de verificação manual completo.

(Tempo real via WebSockets **existe** desde então — ver seção de tempo real acima — cobrindo itens de trabalho/atividade e o arquivamento/desarquivamento de projeto; documentos e outras telas ainda não têm sincronização ao vivo.)
