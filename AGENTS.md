# AGENTS.md

This file provides guidance to AI coding agents (Codex, Claude Code, and others) when working with code in this repository.

## Regras críticas

- **Nunca aponte `SHADOW_DATABASE_URL` para `pm_app` (o banco real).** O Prisma usa essa URL como scratch space (recria/derruba estruturas nela); apontar pro banco real já causou perda total de dados neste projeto. Use sempre o banco dedicado `pm_app_shadow` (criado uma vez só — passo 2 em "Criar uma migration do Prisma" abaixo). Se não existir, o Prisma falha com `P1003` em vez de usar o banco errado.
- **No Nginx Proxy Manager, aponte sempre para o `container_name` (`projetoio-frontend`/`projetoio-backend`), nunca para o nome "cru" do serviço (`frontend`/`backend`).** Na rede `proxy` compartilhada com outros apps do host, o Compose registra um apelido de rede igual ao nome do serviço — outro app com serviço de mesmo nome causa colisão de DNS (já aconteceu neste projeto: o domínio do app estava abrindo outro app).

## Convenções

**Idioma:** responda sempre em português (mesmo que a pergunta venha em outro idioma).

**Mensagens de commit:** sempre em português, sem linha de coautoria (`Co-Authored-By: Claude ...` / equivalente de outros agentes).

**Versionamento e changelog:** ao commitar uma mudança perceptível para quem usa o app (feature, correção de bug visível — mudança interna sem efeito perceptível, tipo refatoração ou ajuste de tsconfig, não precisa), suba `APP_VERSION` em `frontend/src/lib/appInfo.ts` **e** a `version` em `frontend/package.json`/`backend/package.json` (os três nunca devem divergir), e adicione uma entrada em `frontend/src/lib/changelog.ts` descrevendo a mudança em português — é o que alimenta a página `/changelog` (link clicável no "v{APP_VERSION}" do rodapé do app, `components/layout/AppFooter.tsx`).

## Visão geral

"Projeto.io" é uma aplicação de gerenciamento de projetos (inspirada no Plane, porém deliberadamente mais simples): projetos, itens de trabalho em quadro kanban, documentos em markdown e controle de acesso por papéis. Stack: **NestJS + Prisma + PostgreSQL** no backend, **React + Vite + TanStack Query + Tailwind** no frontend, tudo orquestrado via **Docker Compose** (`db`, `backend`, `frontend`).

Não há Node/npm instalado no host — todo build/lint/execução acontece dentro dos containers Docker (ou via containers descartáveis do `node:20-alpine`, ver seção de migrations abaixo).

**App Android** em `mobile/` (React Native + Expo SDK 57 + Expo Router — fixado no 57 porque é o SDK que o Expo Go da Play Store suporta; só subir quando o Expo Go acompanhar), fora do Docker Compose. Consome a mesma API em modo token (header `X-Client-Type: mobile`, sem cookies). Comandos, fluxo de auth e build do APK estão em `mobile/README.md`; regras do Expo em `mobile/AGENTS.md`. Os tipos de `mobile/src/types.ts` espelham parte de `frontend/src/types/index.ts`: ao mudar um shape da API, atualize os dois. O app tem versão própria, fora da regra de versionamento abaixo.

Arquitetura completa (módulos do backend, modelo de dados, autenticação/2FA, tempo real, LGPD, recorrência, métricas, fuso horário, rotas do frontend) está em `docs/architecture.md` — só é preciso ler quando a tarefa exigir esse nível de detalhe.

## Comandos

Há um `Makefile` com atalhos para os comandos abaixo (`make help`): `init`, `up`, `rebuild`, `migrate`, `migration n=nome` (fluxo seguro do banco-sombra `pm_app_shadow`), `typecheck`, `psql`, `backup`, `restore-test`. `make clean` apaga o volume do banco e pede confirmação.

### Subir a aplicação completa
```bash
cp .env.example .env   # defina JWT_ACCESS_SECRET / JWT_REFRESH_SECRET / ENCRYPTION_KEY com valores aleatórios
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

### Deploy em produção
Ver `README.md` ("Deploy em produção") para o passo a passo com domínio próprio + Nginx Proxy Manager (mesmo domínio, roteamento por caminho — `/api` e `/socket.io` para o backend, resto para o frontend). `backend`/`frontend` entram em duas redes Docker (bloco `networks:` no final do `docker-compose.yml`): a interna `projetoio_default` (fala com o `db`) e a externa `proxy` (mesma rede do Nginx Proxy Manager no host, para ele alcançar os serviços sem depender das portas publicadas). `db` fica só na interna. Ver regra crítica do NPM/DNS no topo deste arquivo.

### Criar uma migration do Prisma (schema.prisma alterado)
`prisma migrate dev` é interativo e falha em ambiente non-TTY sempre que há uma mudança "arriscada" (ex.: nova coluna `UNIQUE`), mesmo rodando via `docker run`. Desde o upgrade para o Prisma v7, `migrate diff --from-migrations` **exige** um shadow database configurado em `datasource.shadowDatabaseUrl` no `prisma.config.ts` — não existe mais flag `--shadow-database-url` na CLI (foi removida; `backend/prisma.config.ts` já lê esse valor de `process.env.SHADOW_DATABASE_URL` direto, sem passar por `env()`, exatamente para isso). Fluxo seguro e testado neste repo:

```bash
# 1) Suba o banco (se ainda não estiver rodando)
docker compose up -d db
# a network criada pelo compose é projetoio_default (definida por "name: projeto.io" no docker-compose.yml)

# 2) Crie (uma vez só) um banco-sombra dedicado, SEPARADO do pm_app real
docker exec projetoio-db psql -U app_user -d pm_app -c "CREATE DATABASE pm_app_shadow;"

# 3) Gere apenas o arquivo de migration via diff (sem aplicar)
# node_modules não existe no host (só dentro das imagens Docker) — rode "npm ci" no mesmo
# container antes de qualquer comando prisma, senão o npx baixa uma versão do Prisma diferente
# da fixada no package.json e o resultado do diff pode variar.
mkdir -p backend/prisma/migrations/<timestamp>_nome
docker run --rm -v "<CAMINHO_ABSOLUTO>/backend:/app" -w /app --network projetoio_default \
  -e DATABASE_URL="postgresql://app_user:<SENHA_REAL_DO_.ENV>@db:5432/pm_app" \
  -e SHADOW_DATABASE_URL="postgresql://app_user:<SENHA_REAL_DO_.ENV>@db:5432/pm_app_shadow" \
  node:20-alpine \
  sh -c "apk add --no-cache openssl libssl3 >/dev/null 2>&1 && npm ci >/dev/null 2>&1 && npx prisma migrate diff \
    --from-migrations prisma/migrations \
    --to-schema prisma/schema.prisma \
    --script > prisma/migrations/<timestamp>_nome/migration.sql"

# 4) Aplique de forma não-interativa
docker run --rm -v "<CAMINHO_ABSOLUTO>/backend:/app" -w /app --network projetoio_default \
  -e DATABASE_URL="postgresql://app_user:<SENHA_REAL_DO_.ENV>@db:5432/pm_app" node:20-alpine \
  sh -c "apk add --no-cache openssl libssl3 >/dev/null 2>&1 && npm ci >/dev/null 2>&1 && npx prisma migrate deploy && npx prisma generate"
```

A senha do passo 3/4 é a que está em `POSTGRES_PASSWORD` no `.env` real do ambiente (não use o `app_password` de exemplo do `.env.example` se o `.env` local tiver um valor gerado).

Alpine (`node:20-alpine`) precisa de `apk add --no-cache openssl libssl3` antes de qualquer comando Prisma, senão o engine falha ao detectar libssl.

### Testes, lint e type-check
Não há suíte de testes configurada (nenhum script `test` em `backend/package.json` ou `frontend/package.json`) e não há linter configurado — apenas `tsc` faz o type-check, executado automaticamente dentro do `npm run build` de cada serviço (que roda dentro do `docker build`). Para checar erros de tipo sem rodar o build Docker inteiro, é possível montar o diretório num container `node:20-alpine` e rodar `npm ci && npx tsc --noEmit` (frontend) ou `npm ci && npx nest build` (backend). Sem teste automatizado nem linter, a checagem de tipo é o único freio contra regressão — redobre a atenção em refactors.

### Banco de dados
```bash
docker compose exec backend npx prisma studio          # explorar dados
docker compose exec backend npx prisma migrate deploy  # reaplicar migrations pendentes
docker exec projetoio-db psql -U app_user -d pm_app          # psql direto
```

## Fora do escopo (decisão deliberada do v1)
Sem IA/automação, sem notificações, sem anexos de arquivo, sem papéis por projeto (só papel global), sem workspaces multi-nível. Ver `README.md` para o fluxo de verificação manual completo.

(Tempo real via WebSockets **existe** desde então — ver `docs/architecture.md` — cobrindo itens de trabalho/atividade e o arquivamento/desarquivamento de projeto; documentos e outras telas ainda não têm sincronização ao vivo.)
