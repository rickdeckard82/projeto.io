#!/bin/sh
# Teste de restauração de backup do Projeto.io.
#
# Pega o dump mais recente de $BACKUP_DIR, restaura num Postgres DESCARTÁVEL (container novo,
# volume efêmero) e roda verificações de sanidade. NUNCA toca no banco real nem no container
# `projetoio-db` — é justamente o ponto: provar que o backup restaura de verdade, sem risco.
# Sai com código != 0 se qualquer etapa falhar (bom para alertar via cron/monitoramento).
#
# Uso:
#   ./scripts/restore-test.sh [caminho/para/um.dump]
#
# Variáveis:
#   BACKUP_DIR            onde procurar o dump mais recente  (padrão: ./backups)
#   POSTGRES_DB           nome do banco nos dumps            (padrão: pm_app)
#   BACKUP_AGE_IDENTITY   arquivo de identidade age, se os dumps estiverem cifrados (.age)

set -eu

REPO_ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
[ -f "$REPO_ROOT/.env" ] && . "$REPO_ROOT/.env"

BACKUP_DIR="${BACKUP_DIR:-$REPO_ROOT/backups}"
POSTGRES_DB="${POSTGRES_DB:-pm_app}"

TEST_CONTAINER="projetoio-restore-test-$$"
TEST_PASSWORD="restore-test-$$"
cleanup() {
  docker rm -f "$TEST_CONTAINER" > /dev/null 2>&1 || true
  [ -n "${TMP_PLAIN:-}" ] && rm -f "$TMP_PLAIN"
}
trap cleanup EXIT INT TERM

# 1. Localiza o dump.
if [ $# -ge 1 ]; then
  dump="$1"
else
  dump="$(ls -1t "$BACKUP_DIR"/${POSTGRES_DB}-*.dump "$BACKUP_DIR"/${POSTGRES_DB}-*.dump.age 2>/dev/null | head -n1 || true)"
fi
if [ -z "${dump:-}" ] || [ ! -f "$dump" ]; then
  echo "FALHA: nenhum dump encontrado em $BACKUP_DIR" >&2
  exit 1
fi
echo "Dump sob teste: $dump"

# 2. Decifra se necessário.
restore_src="$dump"
case "$dump" in
  *.age)
    if ! command -v age > /dev/null 2>&1; then
      echo "FALHA: dump cifrado mas 'age' não está instalado." >&2
      exit 1
    fi
    if [ -z "${BACKUP_AGE_IDENTITY:-}" ]; then
      echo "FALHA: dump .age mas BACKUP_AGE_IDENTITY não definida." >&2
      exit 1
    fi
    TMP_PLAIN="$(mktemp)"
    age -d -i "$BACKUP_AGE_IDENTITY" -o "$TMP_PLAIN" "$dump"
    restore_src="$TMP_PLAIN"
    ;;
esac

# 3. Sobe um Postgres descartável.
echo "Subindo Postgres descartável ($TEST_CONTAINER)..."
docker run -d --name "$TEST_CONTAINER" \
  -e POSTGRES_PASSWORD="$TEST_PASSWORD" -e POSTGRES_DB="$POSTGRES_DB" \
  --tmpfs /var/lib/postgresql/data \
  postgres:16-alpine > /dev/null

echo "Aguardando o banco ficar pronto..."
i=0
until docker exec "$TEST_CONTAINER" pg_isready -U postgres -d "$POSTGRES_DB" > /dev/null 2>&1; do
  i=$((i + 1))
  [ "$i" -gt 60 ] && { echo "FALHA: Postgres de teste não ficou pronto a tempo." >&2; exit 1; }
  sleep 1
done

# 4. Restaura.
echo "Restaurando..."
if ! docker exec -i -e PGPASSWORD="$TEST_PASSWORD" "$TEST_CONTAINER" \
  pg_restore -U postgres -d "$POSTGRES_DB" --no-owner --no-privileges --exit-on-error < "$restore_src"; then
  echo "FALHA: pg_restore retornou erro." >&2
  exit 1
fi

# 5. Verificações de sanidade.
psql_q() {
  docker exec -e PGPASSWORD="$TEST_PASSWORD" "$TEST_CONTAINER" \
    psql -U postgres -d "$POSTGRES_DB" -tAc "$1"
}

tables="$(psql_q "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")"
users="$(psql_q "SELECT count(*) FROM users;")"
migrations="$(psql_q "SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL;")"
failed_migr="$(psql_q "SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NULL;")"

echo "  tabelas no schema public : $tables"
echo "  linhas em users          : $users"
echo "  migrations aplicadas     : $migrations"
echo "  migrations incompletas   : $failed_migr"

fail=0
[ "${tables:-0}" -ge 15 ] || { echo "  -> ESPERADO >= 15 tabelas" >&2; fail=1; }
[ "${users:-0}" -ge 1 ]   || { echo "  -> ESPERADO >= 1 usuário (o admin do seed)" >&2; fail=1; }
[ "${migrations:-0}" -ge 1 ] || { echo "  -> ESPERADO >= 1 migration aplicada" >&2; fail=1; }
[ "${failed_migr:-1}" -eq 0 ] || { echo "  -> há migrations incompletas no dump" >&2; fail=1; }

if [ "$fail" -ne 0 ]; then
  echo "RESULTADO: FALHA — o backup restaurou mas não passou nas verificações." >&2
  exit 1
fi

echo "RESULTADO: OK — backup restaurável e íntegro."
