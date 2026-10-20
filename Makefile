SHELL := /bin/bash
COMPOSE := docker compose
NODE_IMAGE := node:20-alpine
# Git Bash no Windows converte "/app" em "C:/Program Files/Git/app" nos argumentos do docker.
export MSYS_NO_PATHCONV := 1

# Lidos do .env na hora (não via `include`: senhas com `$` ou `!` quebrariam o make).
# $(call env,NOME,padrão)
env = $$(v=$$(grep -m1 '^$(1)=' .env 2>/dev/null | cut -d= -f2-); echo "$${v:-$(2)}")
PG_USER = $(call env,POSTGRES_USER,app_user)
PG_DB = $(call env,POSTGRES_DB,pm_app)

.PHONY: help init build up rebuild down clean ps logs health migrate migration shadow-db seed psql typecheck audit backup restore-test

help: ## Lista os alvos disponíveis
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-14s\033[0m %s\n",$$1,$$2}'

init: ## Cria .env a partir do exemplo com segredos aleatórios (só precisa de openssl)
	@if [ -f .env ]; then echo ">> .env já existe, mantido."; exit 0; fi; \
	 cp .env.example .env; \
	 sed -i \
	   -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$$(openssl rand -hex 16)|" \
	   -e "s|^JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=$$(openssl rand -hex 48)|" \
	   -e "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$$(openssl rand -hex 48)|" \
	   -e "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$$(openssl rand -base64 32)|" \
	   -e "s|^SEED_ADMIN_PASSWORD=.*|SEED_ADMIN_PASSWORD=$$(openssl rand -base64 15 | tr -d '/+=')|" \
	   .env; \
	 chmod 600 .env; \
	 echo ">> .env criado. Ajuste SEED_ADMIN_EMAIL e, em produção, NODE_ENV, CORS_ORIGIN, FRONTEND_URL e VITE_API_BASE_URL."; \
	 echo ">> Senha do admin inicial: $$(grep ^SEED_ADMIN_PASSWORD= .env | cut -d= -f2-)"; \
	 echo ">> Guarde a ENCRYPTION_KEY fora do servidor: sem ela um backup restaurado perde os segredos cifrados."

build: ## Builda as imagens
	$(COMPOSE) build

up: ## Sobe a stack (db, backend, frontend)
	$(COMPOSE) up -d

rebuild: ## Rebuilda e recria backend e frontend após alterar código
	$(COMPOSE) build backend frontend
	$(COMPOSE) up -d --force-recreate backend frontend

down: ## Derruba a stack (mantém o volume do banco)
	$(COMPOSE) down

clean: ## Derruba e APAGA o volume do banco (pede confirmação)
	@read -r -p "Isto APAGA o banco (volume projetoio_db_data). Digite APAGAR para confirmar: " ok; \
	 [ "$$ok" = "APAGAR" ] || { echo ">> Cancelado."; exit 1; }
	$(COMPOSE) down -v

ps: ## Status dos containers
	$(COMPOSE) ps

logs: ## Segue os logs (um serviço só: make logs s=backend)
	$(COMPOSE) logs -f --tail=100 $(s)

health: ## Confere o /health da API
	curl -fsS http://localhost:3000/api/v1/health && echo

migrate: ## Aplica as migrations pendentes do Prisma
	$(COMPOSE) exec backend npx prisma migrate deploy

shadow-db: ## Cria (uma vez só) o banco-sombra pm_app_shadow usado pelo `make migration`
	@docker exec projetoio-db psql -U "$(PG_USER)" -d "$(PG_DB)" -tAc "SELECT 1 FROM pg_database WHERE datname='pm_app_shadow'" | grep -q 1 \
	 && echo ">> pm_app_shadow já existe." \
	 || docker exec projetoio-db psql -U "$(PG_USER)" -d "$(PG_DB)" -c "CREATE DATABASE pm_app_shadow;"

# Fluxo de AGENTS.md ("Criar uma migration do Prisma"): só gera o SQL via diff, nunca aplica.
# O banco-sombra é sempre pm_app_shadow — NUNCA o pm_app (o Prisma recria/derruba estruturas nele).
migration: shadow-db ## Gera a migration do schema.prisma alterado: make migration n=nome_da_mudanca
	@[ -n "$(n)" ] || { echo ">> Informe o nome: make migration n=nome_da_mudanca"; exit 1; }
	@dir="backend/prisma/migrations/$$(date +%Y%m%d%H%M%S)_$(n)"; mkdir -p "$$dir"; \
	 pw="$(call env,POSTGRES_PASSWORD)"; \
	 docker run --rm -v "$(CURDIR)/backend:/app" -v /app/node_modules -w /app --network projetoio_default \
	   -e DATABASE_URL="postgresql://$(PG_USER):$$pw@db:5432/$(PG_DB)" \
	   -e SHADOW_DATABASE_URL="postgresql://$(PG_USER):$$pw@db:5432/pm_app_shadow" \
	   $(NODE_IMAGE) sh -c "apk add --no-cache openssl libssl3 >/dev/null 2>&1 && npm ci >/dev/null 2>&1 && \
	     npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script" \
	   > "$$dir/migration.sql" || { rm -rf "$$dir"; exit 1; }; \
	 if ! grep -q '[A-Za-z]' "$$dir/migration.sql" || grep -q 'This is an empty migration' "$$dir/migration.sql"; then \
	   rm -rf "$$dir"; echo ">> Nenhuma mudança no schema."; \
	 else echo ">> Gerada $$dir/migration.sql (revise; aplica no próximo make rebuild ou make migrate)."; fi

seed: ## Cria o admin inicial (no-op se já existir)
	$(COMPOSE) exec backend npx prisma db seed

psql: ## Abre o psql no banco
	docker exec -it projetoio-db psql -U "$(PG_USER)" -d "$(PG_DB)"

typecheck: ## Type-check do backend e do frontend em containers descartáveis (não há linter nem testes)
	docker run --rm -v "$(CURDIR)/backend:/app" -v /app/node_modules -v /app/src/generated -w /app \
	  -e DATABASE_URL=postgresql://x:x@localhost:5432/x $(NODE_IMAGE) \
	  sh -c "apk add --no-cache openssl >/dev/null 2>&1 && npm ci >/dev/null 2>&1 && npx prisma generate >/dev/null && npx tsc --noEmit"
	docker run --rm -v "$(CURDIR)/frontend:/app" -v /app/node_modules -w /app $(NODE_IMAGE) \
	  sh -c "npm ci >/dev/null 2>&1 && npx tsc --noEmit"
	@echo ">> Sem erros de tipo."

audit: ## npm audit do backend e do frontend (AUDIT_LEVEL=high)
	./scripts/audit.sh

backup: ## Backup manual do banco em ./backups (ver docs/backup.md)
	./scripts/backup-db.sh

restore-test: ## Testa a restauração do último backup num Postgres descartável
	./scripts/restore-test.sh
