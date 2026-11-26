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
| Chaves de API só em rotas liberadas (`@AllowApiKey`), com validade, nunca para `ADMIN` e, com `API_KEY_ALLOWED_CIDRS`, só dos IPs da Anthropic | `JwtAuthGuard` + `backend/src/api-keys/` |
| Trilha de auditoria (login, logout, 2FA, papéis, desativação, anonimização, settings) | `backend/src/audit/` — leitura em `/settings/audit` (só `ADMIN`) |
| Backup + teste de restauração | `scripts/backup-db.sh`, `scripts/restore-test.sh` (ver `docs/backup.md`) |
| Criptografia de segredos em repouso (SMTP, tokens de bot, segredo TOTP) | AES-256-GCM, `common/utils/crypto.util.ts` |

## Dependências

`scripts/audit.sh` roda `npm audit` no backend e no frontend (containers — não há Node no host).
`renovate.json` está pronto para um Renovate self-hosted apontado para o Gitea (PRs semanais +
alertas de vulnerabilidade a qualquer hora; `prisma`/`@prisma/client` exigem aprovação manual).

### Vulnerabilidades conhecidas e aceitas

Estado em 2026-11-25: `./scripts/audit.sh` passa (nada de severidade `high` ou acima). Sobram só avisos
`moderate`, aceitos porque a correção exige trocar de versão principal e o caminho vulnerável não roda aqui:

- **Backend — `glob`/`minimatch` via `@nestjs/cli`**: só no build (`nest build`); a correção exige o
  `@nestjs/cli` 12.
- **Frontend — `react-router` 6**: open redirect por barra invertida em `<Link>`/`useNavigate`, quando o
  destino vem do usuário. O app só navega para caminhos próprios ou gerados pelo servidor; a correção
  exige o React Router 7.

`overrides` no `backend/package.json` forçam versões corrigidas de transitivas sem correção upstream
na série atual: `effect` (do CLI `prisma` — a série 7.x do Prisma ainda depende de `effect` vulnerável)
e `brace-expansion` 1.x (do `@nestjs/cli`). Ao subir o Prisma, confira se o override do `effect`
ainda é necessário (`npm ls effect`) e rode `prisma migrate deploy` + `migrate diff` contra um banco
descartável antes do deploy.

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
