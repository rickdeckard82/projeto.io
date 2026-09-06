#!/bin/sh
# Backup do banco Postgres do Projeto.io.
#
# Faz um dump no formato custom do Postgres (-Fc, já comprimido) do banco que roda no container
# `projetoio-db`, grava em $BACKUP_DIR e aplica uma política de retenção. Opcionalmente cifra o
# dump e/ou envia para um destino externo, via ganchos configuráveis por variável de ambiente.
#
# Uso:
#   ./scripts/backup-db.sh
#
# Variáveis (lidas do ambiente ou do .env na raiz do repositório):
#   BACKUP_DIR            diretório de destino dos dumps        (padrão: ./backups)
#   POSTGRES_USER         usuário do Postgres                   (padrão: app_user)
#   POSTGRES_DB           nome do banco                         (padrão: pm_app)
#   POSTGRES_PASSWORD     senha do Postgres                     (obrigatória)
#   DB_CONTAINER          nome do container do banco            (padrão: projetoio-db)
#   BACKUP_AGE_RECIPIENT  se definido (e `age` instalado), cifra o dump para esse destinatário
#                         (chave pública age) e apaga o .dump em claro
#   BACKUP_OFFSITE_HOOK   se definido, é executado com o caminho do arquivo final como $1
#                         (ex.: um script que roda `rclone copy "$1" remoto:bucket/`)
#
# Retenção: mantém todos os dumps dos últimos 7 dias; dumps de domingo por 35 dias; dumps do
# dia 1 de cada mês por 180 dias; o resto é apagado.

set -eu

REPO_ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
[ -f "$REPO_ROOT/.env" ] && . "$REPO_ROOT/.env"

BACKUP_DIR="${BACKUP_DIR:-$REPO_ROOT/backups}"
POSTGRES_USER="${POSTGRES_USER:-app_user}"
POSTGRES_DB="${POSTGRES_DB:-pm_app}"
DB_CONTAINER="${DB_CONTAINER:-projetoio-db}"

if [ -z "${POSTGRES_PASSWORD:-}" ]; then
  echo "ERRO: POSTGRES_PASSWORD não definida (defina no .env ou no ambiente)." >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  echo "ERRO: container '$DB_CONTAINER' não está rodando." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
timestamp="$(date +%Y%m%d-%H%M%S)"
dump_file="$BACKUP_DIR/${POSTGRES_DB}-${timestamp}.dump"

echo "Gerando dump: $dump_file"
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$DB_CONTAINER" \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-privileges \
  > "$dump_file"

# Sanidade mínima: pg_restore -l precisa conseguir ler o índice do arquivo.
if ! docker run --rm -i postgres:16-alpine pg_restore -l < "$dump_file" > /dev/null 2>&1; then
  echo "ERRO: o dump gerado não é legível por pg_restore — arquivo mantido para inspeção." >&2
  exit 1
fi
echo "Dump OK ($(du -h "$dump_file" | cut -f1))."

final_file="$dump_file"

# Gancho opcional de criptografia (age).
if [ -n "${BACKUP_AGE_RECIPIENT:-}" ]; then
  if command -v age > /dev/null 2>&1; then
    age -r "$BACKUP_AGE_RECIPIENT" -o "${dump_file}.age" "$dump_file"
    rm -f "$dump_file"
    final_file="${dump_file}.age"
    echo "Dump cifrado: $final_file"
  else
    echo "AVISO: BACKUP_AGE_RECIPIENT definido mas 'age' não está instalado — dump ficou em claro." >&2
  fi
fi

# Gancho opcional de envio externo.
if [ -n "${BACKUP_OFFSITE_HOOK:-}" ]; then
  echo "Enviando para destino externo via BACKUP_OFFSITE_HOOK..."
  "$BACKUP_OFFSITE_HOOK" "$final_file"
fi

# Retenção.
echo "Aplicando retenção em $BACKUP_DIR"
now="$(date +%s)"
for f in "$BACKUP_DIR"/${POSTGRES_DB}-*.dump "$BACKUP_DIR"/${POSTGRES_DB}-*.dump.age; do
  [ -e "$f" ] || continue
  base="$(basename "$f")"
  # extrai AAAAMMDD do nome pm_app-AAAAMMDD-HHMMSS.dump[.age]
  day="$(echo "$base" | sed -n "s/^${POSTGRES_DB}-\([0-9]\{8\}\)-.*/\1/p")"
  [ -n "$day" ] || continue
  file_epoch="$(date -d "$day" +%s 2>/dev/null || date -j -f %Y%m%d "$day" +%s 2>/dev/null || echo 0)"
  age_days=$(( (now - file_epoch) / 86400 ))
  dow="$(date -d "$day" +%u 2>/dev/null || date -j -f %Y%m%d "$day" +%u 2>/dev/null || echo 0)"  # 7 = domingo
  dom="$(echo "$day" | cut -c7-8)"

  keep=0
  [ "$age_days" -le 7 ] && keep=1
  [ "$dow" = "7" ] && [ "$age_days" -le 35 ] && keep=1
  [ "$dom" = "01" ] && [ "$age_days" -le 180 ] && keep=1

  if [ "$keep" = "0" ]; then
    echo "  removendo $base (${age_days}d)"
    rm -f "$f"
  fi
done

echo "Backup concluído: $final_file"
