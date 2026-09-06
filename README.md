# Projeto.io

Aplicação de gerenciamento de projetos: projetos, itens de trabalho (kanban), documentos em markdown e controle de acesso por papéis (Admin / Senior / Membro / Visualizador).

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

1. Logue como Admin com as credenciais do seed — confirme que o login leva para a página inicial (`/`), não para a lista de projetos.
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
17. Mova um item para uma coluna "Em andamento" com o usuário A; logue como usuário B (membro do mesmo projeto) e confirme que não consegue arrastar/mudar o status desse item (mensagem de erro clara); como Admin, confirme que consegue mudar mesmo assim. Volte com o usuário A e confirme que a trava some ao mover para outra coluna.
18. Em **Configurações → Perfil**, clique "Baixar meus dados" e confirme que baixa um JSON com perfil, tarefas e atividade.
19. Como Admin, em **Configurações → Usuários**, anonimize um usuário de teste e confirme que nome/e-mail somem da lista e o login antigo dele para de funcionar.
20. Acesse `/privacidade` deslogado e confirme que carrega; preencha **Configurações → Privacidade (LGPD)** como Admin e confirme que a página pública reflete o que foi salvo.
21. Como Admin, promova um usuário a **Senior**. Logado como esse usuário, confirme que consegue criar projeto, criar item, arquivar/desarquivar projeto e adicionar membro — mas não consegue editar/excluir o projeto nem remover um membro (esses botões nem aparecem na UI).
22. Na página inicial, crie uma nota em "Notas" (abaixo de "Recentes"); logue como outro usuário e confirme que ela aparece pra ele também. Em `/notes`, confirme que só quem criou (ou um Admin) vê os botões de editar/apagar em cada nota.
23. Em **Configurações → Segurança**, ative a autenticação de dois fatores: escaneie o QR code com um app autenticador (Google Authenticator, Authy, etc.), confirme com o código, e guarde os códigos de recuperação mostrados. Saia e faça login de novo — confirme que agora pede o código de dois fatores antes de entrar. Teste também um código de recuperação (deve funcionar uma única vez) e, em Segurança, desativar o 2FA informando a senha.
24. Abra o quadro de um projeto ativo em duas janelas/navegadores com usuários diferentes (ambos membros do projeto). Em uma, arquive o projeto (**Configurações → Arquivar**). A outra janela deve mostrar um aviso ("projeto foi arquivado por outro usuário") e voltar sozinha para a lista de projetos, sem precisar recarregar; confirme também que tentar mover/criar/editar um item desse projeto (mesmo direto pela API) passa a retornar erro. Abrir um projeto que já estava arquivado direto pela página **Arquivos** continua funcionando normalmente (só leitura).
25. Acesse a aba **Métricas** de um projeto como Admin ou Senior e confirme os números (total de itens, concluídos/cancelados, tempo médio até concluir, duração do projeto, resumo por responsável). Logado como Membro ou Visualizador, confirme que a aba não aparece e que acessar a URL (`/projects/:id/metrics`) direto redireciona para o quadro.

## Deploy em produção (domínio próprio + Nginx Proxy Manager)

Cenário: servidor com Docker, Nginx Proxy Manager (NPM) rodando em outro container no mesmo host, expondo a app em um domínio próprio (ex.: `https://seuapp.com.br`) com frontend e API sob o **mesmo domínio**, por caminho — é o arranjo mais simples porque elimina CORS e mantém os cookies de sessão simples (sem `Domain` cross-subdomain), e já bate com como o WebSocket de tempo real (`lib/socket.ts`) foi implementado (conecta na mesma origem, sem prefixo `/api/v1`).

### 1. Variáveis de ambiente no `.env` do servidor

```bash
NODE_ENV=production
CORS_ORIGIN=https://seuapp.com.br
FRONTEND_URL=https://seuapp.com.br
VITE_API_BASE_URL=https://seuapp.com.br/api/v1
JWT_ACCESS_SECRET=<valor aleatório forte, mín. 32 caracteres — ex.: openssl rand -base64 48>
JWT_REFRESH_SECRET=<outro valor aleatório forte, diferente do de acesso>
ENCRYPTION_KEY=<openssl rand -base64 32>
SEED_ADMIN_PASSWORD=<troque o padrão antes do primeiro deploy>
```

Com `NODE_ENV=production`, o backend **não sobe** se `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`/`ENCRYPTION_KEY` estiverem ausentes, com valor de exemplo, iguais entre si ou curtos demais; e o seed **não cria** o admin se `SEED_ADMIN_PASSWORD` ainda for o padrão (`ChangeMe123!`). Confira o log do container `projetoio-backend` no primeiro deploy.

**Cloudflare Turnstile (opcional):** para ligar a verificação anti-robô em login e cadastro, defina `VITE_TURNSTILE_SITE_KEY` (site key) e `TURNSTILE_SECRET_KEY` (secret key). Sem elas, o recurso fica desligado. A site key é build-time do frontend (`docker compose build frontend` ao trocar); a secret key é lida em runtime pelo backend. O CSP do `frontend/nginx.conf` já libera `challenges.cloudflare.com`.

`VITE_API_BASE_URL` é usada em **build time** do frontend (fica embutida no bundle estático) — depois de definir/alterar essa variável é preciso `docker compose build frontend` de novo; só reiniciar o container não atualiza nada.

### 2. Subir os containers

```bash
docker compose --env-file .env up --build -d
```

O `docker-compose.yml` publica as portas 3000 (backend), 5173→80 (frontend) e 5432 (Postgres) **apenas no loopback do host** (`127.0.0.1`), controlado por `HOST_BIND_IP` no `.env` — nenhuma delas fica acessível pela internet mesmo sem firewall. O NPM alcança os containers pela rede interna do Docker (rede `proxy`), não pelas portas publicadas. Só mude `HOST_BIND_IP=0.0.0.0` se precisar acessar os serviços de fora do host, e nesse caso ponha um firewall na frente (deixe só 80/443 abertos, e 22 restrito).

### 3. Rede compartilhada com o Nginx Proxy Manager

Se o NPM já roda no mesmo host numa rede Docker própria (padrão comum: uma rede chamada `proxy`), é mais simples este app entrar nela do que pedir para o NPM entrar na rede deste app. `backend` e `frontend` já estão configurados em `docker-compose.yml` para entrar em duas redes: a interna (`projetoio_default`, usada para falar com o `db`) e a externa `proxy`:

```yaml
networks:
  default:
    name: projetoio_default
  proxy:
    external: true
    name: proxy
```

Se a rede `proxy` ainda não existir neste host, crie antes de subir os containers (`docker network create proxy`) — ou ajuste o `name:` acima para o nome real da rede do seu NPM. O `db` fica só na rede interna (nunca entra na `proxy`), então o Postgres não fica alcançável a partir de outros containers atrás do NPM.

### 4. Configurar o Proxy Host no NPM

**Use sempre o `container_name` (`projetoio-frontend`/`projetoio-backend`), nunca o nome "cru" do serviço (`frontend`/`backend`).** Quando a rede `proxy` é compartilhada com outros apps no mesmo host, o Docker Compose registra um apelido de rede igual ao **nome do serviço** para cada container — se outro app no mesmo host também tiver um serviço chamado `frontend` (ou `backend`), os dois passam a responder pelo mesmo nome nessa rede, e o DNS do Docker resolve para um ou outro de forma inconsistente (sintoma: acessar seu domínio abre o app errado). `container_name` é garantido único pelo próprio Docker (ele recusa subir dois containers com o mesmo `container_name` no host), então nunca colide.

1. **Proxy Host novo** → aba **Details** → Domain Names: `seuapp.com.br`. Scheme: `http`. **Forward Hostname/IP: `projetoio-frontend`** (não `projetoio-backend` — esse campo é a rota "coringa" `/`, que precisa servir os arquivos estáticos do frontend). Forward Port: `80`.
2. Aba **SSL**: peça um certificado Let's Encrypt novo, ative "Force SSL" e "HTTP/2 Support".
3. Aba **Custom Locations**, adicione duas:
   - Location `/api` → Forward Hostname/IP: `projetoio-backend`, Forward Port: `3000`.
   - Location `/socket.io` → Forward Hostname/IP: `projetoio-backend`, Forward Port: `3000`, e **ative "Websockets Support"** nessa location (e, por segurança, no proxy host todo também). **Esse é o passo mais fácil de esquecer** — sem ele, o tempo real (mudanças de card entre navegadores) simplesmente não funciona, sem erro óbvio na tela.

> **"502 Bad Gateway" logo após configurar?** É quase sempre a aba **Details** apontando para o serviço/porta errados — confira que ali está `projetoio-frontend`:`80`, **não** `projetoio-backend`:`80` (o backend nem escuta na porta 80, só na 3000; só as Custom Locations `/api`/`/socket.io` devem apontar para `projetoio-backend`).
>
> **Domínio abre o app errado (não o seu)?** Sinal de colisão de nome de serviço na rede `proxy` compartilhada — confira que o Forward Hostname/IP em todas as locations usa `projetoio-frontend`/`projetoio-backend` (container_name), não `frontend`/`backend` (nome do serviço, que pode colidir com outro app no mesmo host).

### 5. Verificação pós-deploy

- `https://seuapp.com.br/api/v1/health` deve responder `200`.
- Login funciona e o cookie de sessão persiste ao recarregar (confirma que `NODE_ENV=production`/cookies `Secure` não quebraram nada sob HTTPS).
- Abra o quadro em duas abas logadas com usuários diferentes e confirme que mover um card atualiza a outra sem reload (confirma que o `/socket.io` com Websockets Support está roteado corretamente — ver passo 4).
- No primeiro login como administrador, o sistema exige ativar a verificação em duas etapas (2FA) antes de liberar o acesso — tenha um app autenticador à mão.

### 6. Backup

Configure o backup automático do banco **antes** de colocar dados de verdade — ver [`docs/backup.md`](docs/backup.md) (scripts `scripts/backup-db.sh` e `scripts/restore-test.sh`, agendamento por cron/systemd, e o gancho para envio off-site).

## Comandos úteis

```bash
docker compose exec backend npx prisma studio          # explorar o banco
docker compose exec backend npx prisma migrate deploy  # rodar migrations manualmente
docker compose logs -f backend
docker compose down          # para os containers (mantém o volume do banco)
./scripts/backup-db.sh                                  # backup manual do banco (ver docs/backup.md)
./scripts/restore-test.sh                               # testa a restauração do último backup
```
