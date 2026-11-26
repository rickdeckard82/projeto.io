# Notas de segurança

Complementa `docs/architecture.md` (cadeia de autorização, 2FA, isolamento por projeto) e
`docs/backup.md`. Aqui ficam decisões e pendências de segurança que não cabem no código.

## Camadas já implementadas

| Camada | Onde |
| --- | --- |
| Rate limit em login/cadastro/2FA/verificação de e-mail | `@nestjs/throttler`, `ThrottlerModule` no `AppModule` + `@Throttle` no `AuthController` |
| Verificação anti-robô (Cloudflare Turnstile) em login e cadastro | `TurnstileGuard` (`@UseGuards` nas rotas) + widget `Turnstile.tsx`; opcional — inerte sem `TURNSTILE_SECRET_KEY` / `VITE_TURNSTILE_SITE_KEY` |
| Segredos de produção validados na subida (aborta se ausentes/de exemplo/fracos) | `backend/src/common/config/security-env.ts` |
| Portas dos containers publicadas só no loopback do host | `docker-compose.yml` (`HOST_BIND_IP`, padrão `127.0.0.1`) |
| Cabeçalhos de segurança (HSTS, CSP, X-Frame-Options, nosniff, Referrer-Policy) | `helmet` na API (`main.ts`) + `frontend/nginx.conf` |
| 2FA obrigatório para `ADMIN` | `TwoFactorEnforcedGuard` + `frontend` `TwoFactorGate` / `/setup-2fa` |
| Trocar a própria senha exige a atual; toda troca revoga as outras sessões, os dispositivos confiáveis e as chaves de API | `UsersService.update` |
| Chaves de API só em rotas liberadas (`@AllowApiKey`), com validade e nunca para `ADMIN` | `JwtAuthGuard` + `backend/src/api-keys/` |
| Trilha de auditoria (login, logout, 2FA, papéis, desativação, anonimização, settings) | `backend/src/audit/` — leitura em `/settings/audit` (só `ADMIN`) |
| Backup + teste de restauração | `scripts/backup-db.sh`, `scripts/restore-test.sh` (ver `docs/backup.md`) |
| Criptografia de segredos em repouso (SMTP, tokens de bot, segredo TOTP) | AES-256-GCM, `common/utils/crypto.util.ts` |

## Dependências

`scripts/audit.sh` roda `npm audit` no backend e no frontend (containers — não há Node no host).
`renovate.json` está pronto para um Renovate self-hosted apontado para o Gitea (PRs semanais +
alertas de vulnerabilidade a qualquer hora; `prisma`/`@prisma/client` exigem aprovação manual).

### Vulnerabilidades conhecidas e aceitas (revisar a cada bump do Prisma)

`npm audit` no backend reporta ~10 avisos, **todos** em dependências transitivas do **CLI
`prisma`** (`@prisma/dev`, `@prisma/config`, `hono`, `@hono/node-server`, `mysql2`, `fast-uri`,
`qs`, `valibot`, `deepmerge-ts`). O CLI está em `dependencies` (não `devDependencies`) só porque
o `docker-entrypoint.sh` roda `prisma migrate deploy` na subida do container.

Por que são aceitas hoje:

- **Nenhum dos caminhos vulneráveis executa neste app.** As falhas estão no servidor HTTP do
  `prisma dev` (`hono`/`@hono/node-server`/`qs`), no driver `mysql2` e no parser `fast-uri` —
  este projeto usa PostgreSQL via `@prisma/adapter-pg` e nunca sobe o `prisma dev`. Em runtime
  só roda `migrate deploy`, que não toca nesse código.
- `npm audit fix --force` quer **rebaixar `prisma` para a série 6.x**, o que quebraria o setup do
  Prisma 7 (adapter driver, `prisma.config.ts`) — inaceitável (ver `AGENTS.md`).

O que fazer: subir `prisma` + `@prisma/client` juntos quando sair uma versão 7.x que atualize
essas transitivas, e reconferir `./scripts/audit.sh`. Se o ruído incomodar antes disso, mover o
CLI para um estágio separado do `Dockerfile` (rodar as migrations fora do container de runtime).

`react-markdown` (frontend) renderiza markdown de documentos sem `rehype-raw` / `skipHtml=false`,
então HTML embutido no conteúdo é escapado — sem vetor de XSS por aí.

## Pendências (fora do código)

- **Hardening do host:** firewall default-deny (só 80/443; 22 restrito), SSH só por chave,
  `fail2ban`. Ver `README.md` › Deploy.
- **Criptografia de disco em repouso** (LUKS) no host onde vivem o volume do Postgres e os backups.
- **Backup off-site:** hoje os dumps ficam só no host — plugar `BACKUP_OFFSITE_HOOK` +
  `BACKUP_AGE_RECIPIENT` (ver `docs/backup.md`).
- **Turnstile no reenvio de confirmação de e-mail** — hoje só login e cadastro têm o widget; o
  reenvio se apoia no cooldown de 60s + resposta genérica + rate limit. Estender é trivial
  (`@UseGuards(TurnstileGuard)` na rota + token no `resendVerification`).
- **Testes de autorização automatizados** — não há suíte de testes no projeto; o freio hoje é
  só o `tsc`.
- **Agregação de logs** (stdout dos containers → coletor com retenção) — a trilha de auditoria
  cobre eventos de negócio, mas não os logs de aplicação/infra.
