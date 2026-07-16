# Projeto.io

Aplicação de gerenciamento de projetos: projetos, itens de trabalho (kanban), documentos em markdown e controle de acesso por papéis (Admin / Membro / Visualizador).

## Stack

- Backend: NestJS + Prisma + PostgreSQL
- Frontend: React + Vite + TanStack Query + Tailwind
- Docker Compose: `db`, `backend`, `frontend`

## Como rodar

```bash
cp .env.example .env
# edite .env e defina JWT_ACCESS_SECRET / JWT_REFRESH_SECRET / ENCRYPTION_KEY com valores aleatórios
# (ENCRYPTION_KEY: gere com `openssl rand -base64 32` — usada para criptografar a senha do SMTP)

docker compose up --build -d
docker compose ps
curl http://localhost:3000/api/v1/health
```

Na primeira subida, o backend roda as migrations e o seed automaticamente (via `docker-entrypoint.sh`), criando um usuário Admin com as credenciais definidas em `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (padrão: `admin@example.com` / `ChangeMe123!`).

Acesse a aplicação em `http://localhost:5173`.

## Cadastro público, domínios permitidos e confirmação por e-mail

Por padrão, **ninguém consegue se autocadastrar** em `/register`: a lista de domínios permitidos começa vazia. Para liberar o autocadastro:

1. Logue como Admin e acesse **Configurações → E-mail (SMTP)** (`/settings/smtp`): preencha servidor, porta, SSL, e-mail de envio, usuário e senha de um servidor SMTP real e salve. A senha é criptografada (AES-256-GCM, chave `ENCRYPTION_KEY`) antes de ir para o banco e nunca é devolvida pela API (`GET` retorna só `hasPassword: boolean`).
2. Acesse **Configurações → Domínios permitidos** (`/settings/allowed-domains`) e adicione cada domínio de e-mail que pode se autocadastrar (ex.: `suaempresa.com.br`).

Com isso configurado, o fluxo de autocadastro passa a ser:

1. Usuário preenche `/register` com um e-mail de domínio permitido → conta é criada com `emailVerifiedAt = null` e um e-mail de confirmação é enviado (link de 48h) — **sem login automático**.
2. Se o domínio não estiver na lista, ou o SMTP não estiver configurado, ou o envio do e-mail falhar, o cadastro é rejeitado (e, no caso de falha de envio, a conta recém-criada é desfeita — nunca fica um usuário órfão sem forma de confirmar).
3. Usuário clica no link recebido (`/verify-email?token=...`) → `emailVerifiedAt` é preenchido e o login passa a ser permitido.
4. Enquanto não confirmado, `/login` retorna erro específico com um botão de reenvio (`POST /auth/resend-verification`, com cooldown de 60s e resposta genérica para não permitir enumeração de e-mails cadastrados).

Usuários criados por um Admin em **Configurações → Usuários** (`POST /users`) pulam esse fluxo inteiro (já nascem com e-mail confirmado) — a restrição vale só para o autocadastro público.

Falhas de envio de e-mail (SMTP incorreto, credenciais inválidas etc.) ficam registradas no log do backend (`docker compose logs backend`) para diagnóstico, mesmo a resposta ao usuário sendo sempre uma mensagem genérica.

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
11. Em **Configurações → E-mail (SMTP)**, configure um servidor SMTP real; em **Configurações → Domínios permitidos**, adicione um domínio de teste.
12. Deslogado, tente `/register` com um e-mail de domínio **não** permitido → confirme a rejeição com mensagem clara, sem criar conta.
13. `/register` com e-mail do domínio permitido → confirme a tela "verifique seu e-mail" (sem login automático) e que o e-mail de confirmação chega na caixa real.
14. Abra o link do e-mail (`/verify-email?token=...`) → confirme a tela de sucesso; faça `/login` e confirme que agora funciona.
15. Tente `/login` com uma conta ainda não confirmada → confirme a mensagem "confirme seu e-mail" e teste o botão de reenvio.
16. Abra o quadro do mesmo projeto em duas janelas/navegadores com usuários diferentes; mova um card ou adicione um comentário em uma janela e confirme que a outra atualiza sozinha, sem precisar recarregar (tempo real via WebSocket).

## Comandos úteis

```bash
docker compose exec backend npx prisma studio          # explorar o banco
docker compose exec backend npx prisma migrate deploy  # rodar migrations manualmente
docker compose logs -f backend
docker compose down          # para os containers (mantém o volume do banco)
```
