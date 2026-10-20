# Backup e restauração

> Contexto: o volume Docker `projetoio_db_data` é **persistência, não backup** — não protege
> contra `DROP` acidental, corrupção ou ransomware. Este projeto já teve perda total de dados
> uma vez (ver `AGENTS.md`). Backup com teste de restauração é obrigatório em produção.

## Scripts

| Script | O que faz |
| --- | --- |
| `scripts/backup-db.sh` | `pg_dump -Fc` do banco no container `projetoio-db` → `./backups/`, com retenção. Ganchos opcionais de criptografia (`age`) e envio externo. |
| `scripts/restore-test.sh` | Restaura o dump mais recente num Postgres **descartável** (container novo, volume efêmero) e roda verificações de sanidade. Nunca toca no banco real. Sai com código ≠ 0 se falhar. |

Ambos leem `POSTGRES_USER` / `POSTGRES_DB` / `POSTGRES_PASSWORD` do `.env` na raiz do repositório.

### Uso manual

```bash
./scripts/backup-db.sh        # gera ./backups/pm_app-AAAAMMDD-HHMMSS.dump
./scripts/restore-test.sh     # testa o dump mais recente
./scripts/restore-test.sh ./backups/pm_app-20260906-030000.dump   # testa um específico
```

### Retenção (em `backup-db.sh`)

- todos os dumps dos últimos **7 dias**;
- dumps de **domingo** por 35 dias;
- dumps do **dia 1** de cada mês por 180 dias;
- o resto é apagado a cada execução.

## Agendamento

### cron (host)

```cron
# Backup diário às 03:00
0 3 * * *  cd /caminho/para/projeto.io && ./scripts/backup-db.sh >> /var/log/projetoio-backup.log 2>&1
# Teste de restauração toda segunda às 04:00 — se falhar, o cron manda o stderr por e-mail
0 4 * * 1  cd /caminho/para/projeto.io && ./scripts/restore-test.sh >> /var/log/projetoio-restore-test.log 2>&1
```

### systemd timer (alternativa)

`/etc/systemd/system/projetoio-backup.service`:

```ini
[Service]
Type=oneshot
WorkingDirectory=/caminho/para/projeto.io
ExecStart=/caminho/para/projeto.io/scripts/backup-db.sh
```

`/etc/systemd/system/projetoio-backup.timer`:

```ini
[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

`systemctl enable --now projetoio-backup.timer` (idem para um `projetoio-restore-test.timer` semanal).

## Backup automático por FTP (pela interface)

Em **Configurações > Backup** (só administradores) o próprio backend envia todo dia, no horário
configurado (fuso `BACKUP_TIMEZONE`, padrão `America/Sao_Paulo`), um dump completo do banco para
um servidor FTP/FTPS: `projetoio-banco-AAAAMMDD-HHMMSS.sql.gz`.

- **O que cobre:** o banco é todo o estado do sistema — projetos, itens, documentos (markdown fica
  no banco), notas, usuários, papéis, 2FA, notificações, auditoria e configurações. O app não grava
  arquivos em disco (não há anexos; avatar é só uma URL).
- **O que não cobre:** o `.env`. Guarde à parte, fora do servidor, pelo menos a `ENCRYPTION_KEY`:
  restaurar o banco com outra chave perde os segredos cifrados nele (segredos de 2FA — esses
  usuários precisam ter o 2FA refeito —, senhas do SMTP/FTP e tokens do Telegram/Pushover, que
  precisam ser digitados de novo). `JWT_*` podem ser novos (só derrubam as sessões abertas).
- **FTPS explícito** ligado por padrão (o certificado não é validado — servidores de backup costumam
  ter certificado autoassinado). Sem FTPS o dump trafega em claro.
- Envio como `.part`, conferência de tamanho (quando o servidor tem `SIZE`) e renomeação no fim;
  mantém as N cópias mais recentes na pasta (só arquivos com o padrão de nome acima).
- **Destino só de gravação (Pulse Backup):** envia direto com o nome final, sem `SIZE`/`DELE`/renomear,
  e não apaga nada; o Pulse Backup valida o `.sql.gz` pelo marcador final do `pg_dump`, cifra e cuida
  da retenção.
- **Não fica cópia local:** o arquivo é gerado numa pasta temporária do container e apagado assim que
  enviado; sobras de um backend que morreu no meio são removidas ao iniciar.
- Se o backend estava parado no horário, roda quando voltar, desde que em até 6 horas.
- Cada execução fica na **Auditoria** (`Backup enviado` / `Backup falhou`) e o último resultado aparece
  na própria tela.

### Restaurar o `.sql.gz`

O dump tem `DROP ... IF EXISTS` antes de cada objeto, então recria as tabelas por cima do banco
existente. Pare o backend antes (para ninguém gravar no meio) e use o mesmo `.env` (`ENCRYPTION_KEY`):

```bash
docker compose stop backend
gunzip -c projetoio-banco-20261019-023000.sql.gz |   docker exec -i projetoio-db psql -U app_user -d pm_app -v ON_ERROR_STOP=1
docker compose start backend   # o entrypoint roda as migrations novas, se o backup for de versão anterior
```

Em servidor novo: suba só o `db` (`docker compose up -d db`), restaure como acima e depois suba o resto.

## Off-site (pendente de configuração)

Hoje os dumps ficam **só no host** — o que não protege contra perda do servidor inteiro. Os
ganchos já estão prontos, falta plugar um destino:

### Criptografia (recomendado antes de mandar para fora)

```bash
# gere um par de chaves uma vez:  age-keygen -o ~/.config/projetoio/backup.age
export BACKUP_AGE_RECIPIENT="age1...."          # chave pública, no backup-db.sh
export BACKUP_AGE_IDENTITY="/root/.config/projetoio/backup.age"   # chave privada, no restore-test.sh
```

### Envio externo

Defina `BACKUP_OFFSITE_HOOK` apontando para um script que recebe o caminho do dump como `$1`:

```bash
# exemplo: scripts/offsite-rclone.sh
#!/bin/sh
exec rclone copy "$1" "b2:meu-bucket/projetoio-backups/"
```

```bash
export BACKUP_OFFSITE_HOOK="/caminho/para/projeto.io/scripts/offsite-rclone.sh"
```

Alternativas comuns: `rclone` (S3/B2/Drive/…), `restic` (dedup + retenção própria), `borg`
(para servidor via SSH). Qualquer uma serve — o gancho só precisa levar o arquivo para fora.
