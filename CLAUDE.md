# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão geral

"Projeto.io" é uma aplicação de gerenciamento de projetos (inspirada no Plane, porém deliberadamente mais simples): projetos, itens de trabalho em quadro kanban, documentos em markdown e controle de acesso por papéis. Stack: **NestJS + Prisma + PostgreSQL** no backend, **React + Vite + TanStack Query + Tailwind** no frontend, tudo orquestrado via **Docker Compose** (`db`, `backend`, `frontend`).

Não há Node/npm instalado no host — todo build/lint/execução acontece dentro dos containers Docker (ou via containers descartáveis do `node:20-alpine`, ver seção de migrations abaixo).

## Comandos

### Subir a aplicação completa
```bash
cp .env.example .env   # defina JWT_ACCESS_SECRET / JWT_REFRESH_SECRET com valores aleatórios
docker compose up --build -d
docker compose ps
curl http://localhost:3000/api/v1/health
```
Frontend em `http://localhost:5173`, API em `http://localhost:3000/api/v1`. Na subida, `docker-entrypoint.sh` do backend roda `prisma migrate deploy` e depois `prisma db seed` (idempotente — não recria o admin se já existir).

### Rebuild após alterar código
```bash
docker compose build backend frontend
docker compose up -d --force-recreate backend frontend
```

### Criar uma migration do Prisma (schema.prisma alterado)
`prisma migrate dev` é interativo e falha em ambiente non-TTY sempre que há uma mudança "arriscada" (ex.: nova coluna `UNIQUE`), mesmo rodando via `docker run`. `prisma migrate diff --from-migrations` **exige** `--shadow-database-url` (não há como omitir). Fluxo seguro e testado neste repo:

```bash
# 1) Suba o banco (se ainda não estiver rodando)
docker compose up -d db
# a network criada pelo compose é projetoio_default (definida por "name: projeto.io" no docker-compose.yml)

# 2) Crie (uma vez só) um banco-sombra dedicado, SEPARADO do pm_app real
docker exec projetoio-db psql -U app_user -d pm_app -c "CREATE DATABASE pm_app_shadow;"

# 3) Gere apenas o arquivo de migration via diff (sem aplicar)
mkdir -p backend/prisma/migrations/<timestamp>_nome
docker run --rm -v "<CAMINHO_ABSOLUTO>/backend:/app" -w /app --network projetoio_default \
  -e DATABASE_URL="postgresql://app_user:app_password@db:5432/pm_app" node:20-alpine \
  sh -c "apk add --no-cache openssl libssl3 >/dev/null 2>&1 && npx prisma migrate diff \
    --from-migrations prisma/migrations \
    --to-schema-datamodel prisma/schema.prisma \
    --shadow-database-url postgresql://app_user:app_password@db:5432/pm_app_shadow \
    --script > prisma/migrations/<timestamp>_nome/migration.sql"

# 4) Aplique de forma não-interativa
docker run --rm -v "<CAMINHO_ABSOLUTO>/backend:/app" -w /app --network projetoio_default \
  -e DATABASE_URL="postgresql://app_user:app_password@db:5432/pm_app" node:20-alpine \
  sh -c "apk add --no-cache openssl libssl3 >/dev/null 2>&1 && npx prisma migrate deploy && npx prisma generate"
```

**REGRA CRÍTICA — nunca aponte `--shadow-database-url` para `pm_app` (o banco real).** O Prisma usa essa URL como scratch space (recria/derruba estruturas nela); apontar para o banco real já causou perda total de dados neste projeto. Use sempre o banco dedicado `pm_app_shadow` (passo 2, só precisa ser criado uma vez; se não existir o Prisma falha com `P1003` em vez de usar o banco errado).

Alpine (`node:20-alpine`) precisa de `apk add --no-cache openssl libssl3` antes de qualquer comando Prisma, senão o engine falha ao detectar libssl.

### Testes, lint e type-check
Não há suíte de testes configurada (nenhum script `test` em `backend/package.json` ou `frontend/package.json`) e não há linter configurado — apenas `tsc` faz o type-check, executado automaticamente dentro do `npm run build` de cada serviço (que roda dentro do `docker build`). Para checar erros de tipo sem rodar o build Docker inteiro, é possível montar o diretório num container `node:20-alpine` e rodar `npm ci && npx tsc --noEmit` (frontend) ou `npm ci && npx nest build` (backend).

### Banco de dados
```bash
docker compose exec backend npx prisma studio          # explorar dados
docker compose exec backend npx prisma migrate deploy  # reaplicar migrations pendentes
docker exec projetoio-db psql -U app_user -d pm_app          # psql direto
```

## Arquitetura

### Backend (`backend/src`) — NestJS

Módulos por recurso, cada um com `*.controller.ts` + `*.service.ts` + `dto/`: `auth`, `users`, `projects`, `labels`, `work-items`, `documents`, mais `prisma/` (client singleton) e `common/` (guards, decorators, filters compartilhados).

**Cadeia de autorização (aplicada globalmente via `APP_GUARD` em `app.module.ts`):**
1. `JwtAuthGuard` — valida o JWT (cookie `access_token` ou header `Bearer`); rotas marcadas com `@Public()` pulam essa checagem.
2. `RolesGuard` — compara `@Roles(...)` do handler com o `globalRole` do usuário (`ADMIN` / `MEMBER` / `VIEWER`). Sem `@Roles()`, qualquer usuário autenticado passa.
3. `ProjectMemberGuard` — aplicado manualmente com `@UseGuards(ProjectMemberGuard)` + `@ProjectResource(kind, param)` nos controllers de recursos de projeto. Resolve o `projectId` a partir do parâmetro de rota (direto se `kind: 'project'`, ou via lookup se `'workItem' | 'document' | 'label'`), depois:
   - Admin sempre passa.
   - Caso contrário, precisa de uma linha em `project_members`.
   - Sem membership, **GET** ainda passa se `project.isPublic === true` (leitura pública); qualquer outro método é bloqueado.

Esse desenho faz o `ProjectMemberGuard` cuidar só de "faz parte do projeto (ou o projeto é público)?" — a distinção de permissão de escrita por papel (Admin/Membro podem escrever, Visualizador não) fica inteiramente a cargo do `@Roles()` em cada endpoint de mutação.

**Modelo de dados (`prisma/schema.prisma`):** `User` (papel global) → `Project` (dono, `key` único opcional tipo "ZABBIXIA", `icon`, `coverColor`, `isPublic`, `archivedAt`) → `ProjectMember` (join table, é a fonte da verdade de acesso) → `Status` (colunas do kanban, categorizadas em `BACKLOG/UNSTARTED/STARTED/COMPLETED/CANCELLED`, 5 seedadas por projeto em `default-statuses.ts`) → `WorkItem` (auto-referencia `parentId` para sub-itens; `ItemAssignee`/`ItemLabel` são join tables N:N) → `Document` (conteúdo markdown puro).

`Project.key`: se o usuário não informar, é sugerido a partir do nome (`project-key.util.ts`) e desambiguado com sufixo numérico em caso de colisão; é imutável após a criação (não existe no `UpdateProjectDto`).

Auth usa JWT de acesso (curto) + refresh token persistido (hash SHA-256) em `refresh_tokens`, permitindo revogação/logout. Tokens vão em cookies httpOnly (`access_token`/`refresh_token`), setados em `auth.controller.ts`.

### Frontend (`frontend/src`) — React + Vite

- **Roteamento**: `App.tsx` define as rotas; tudo autenticado fica sob `<ProtectedRoute>` → `<AppShell>` (Topbar + Sidebar fixos, `<Outlet/>` para o conteúdo). Rotas de projeto são aninhadas sob `ProjectDetailLayout` (`/projects/:projectId/{board,list,documents,settings}`).
- **Dados/estado servidor**: TanStack Query em todo lugar; `api/queryKeys.ts` centraliza as chaves. Módulos em `api/*.ts` são funções `axios` puras por recurso; `api/client.ts` tem o interceptor que renova o access token via `/auth/refresh` em qualquer `401` (exceto chamadas para `/auth/*`) e replay da requisição original.
- **Sessão**: `auth/AuthContext.tsx` guarda o usuário atual (busca `/auth/me` no mount); `auth/RoleGate.tsx` (`<RoleGate allow={['ADMIN']}>`) e `lib/permissions.ts` (funções puras `canCreateProject`, `canEditItem`, etc.) fazem a checagem de UI — **é só conveniência visual**, a garantia real de acesso é sempre o backend.
- **Kanban**: `components/kanban/KanbanBoard.tsx` usa `@dnd-kit/core`; `onDragEnd` chama `PATCH /items/:id/status`. Colunas vêm de `GET /projects/:id/statuses`.
- **Sidebar** (`components/layout/Sidebar.tsx`): busca a lista de projetos ativos do usuário e monta navegação expansível por projeto (Itens → view de lista, Páginas → documentos), com auto-expansão do projeto da rota atual.
- Sem upload de arquivo real: capa de projeto (`coverColor`) e "links rápidos" da home (`components/home/QuickLinks.tsx`) usam paletas fixas / `localStorage` por usuário, não backend.

### Fora do escopo (decisão deliberada do v1)
Sem IA/automação, sem websockets/tempo real, sem notificações, sem anexos de arquivo, sem papéis por projeto (só papel global), sem workspaces multi-nível. Ver `README.md` para o fluxo de verificação manual completo.
