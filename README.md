# Projeto.io

Aplicação de gerenciamento de projetos: projetos, itens de trabalho (kanban), documentos em markdown e controle de acesso por papéis (Admin / Membro / Visualizador).

## Stack

- Backend: NestJS + Prisma + PostgreSQL
- Frontend: React + Vite + TanStack Query + Tailwind
- Docker Compose: `db`, `backend`, `frontend`

## Como rodar

```bash
cp .env.example .env
# edite .env e defina JWT_ACCESS_SECRET / JWT_REFRESH_SECRET com valores aleatórios

docker compose up --build -d
docker compose ps
curl http://localhost:3000/api/v1/health
```

Na primeira subida, o backend roda as migrations e o seed automaticamente (via `docker-entrypoint.sh`), criando um usuário Admin com as credenciais definidas em `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (padrão: `admin@example.com` / `ChangeMe123!`).

Acesse a aplicação em `http://localhost:5173`.

## Fluxo de verificação manual

1. Logue como Admin com as credenciais do seed.
2. Registre um segundo usuário (fica como Membro por padrão) em `/register`.
3. Como Admin, crie um projeto em "Novo Projeto".
4. Em "Configurações" do projeto, adicione o Membro criado.
5. Saia e logue como o Membro: o botão "Novo Projeto" não deve aparecer, mas o projeto deve estar visível.
6. No quadro (Board), crie um item, arraste entre colunas, recarregue a página e confirme que a coluna persistiu.
7. Abra o item, defina responsável/etiqueta/prioridade/data, crie um sub-item.
8. Na aba "Lista", filtre por responsável/etiqueta.
9. Em "Documentos", crie um documento markdown, edite e recarregue para confirmar persistência.
10. Como Admin, promova o Membro a Visualizador (`PATCH /api/v1/users/:id/role`) e confirme que os controles de edição somem para esse usuário, mantendo acesso de leitura.

## Comandos úteis

```bash
docker compose exec backend npx prisma studio          # explorar o banco
docker compose exec backend npx prisma migrate deploy  # rodar migrations manualmente
docker compose logs -f backend
docker compose down          # para os containers (mantém o volume do banco)
```
